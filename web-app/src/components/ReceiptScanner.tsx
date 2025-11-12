import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { launchCamera, launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import { createWorker } from 'tesseract.js';

// Import conditionnel pour DocumentPicker (seulement sur mobile)
let DocumentPicker: any = null;
if (Platform.OS === 'ios' || Platform.OS === 'android') {
  DocumentPicker = require('react-native-document-picker').default;
}

interface ExtractedData {
  amount?: number;
  tax_amount?: number;
  date?: string;
  description?: string;
  reference?: string;
}

interface ReceiptScannerProps {
  onDataExtracted: (data: ExtractedData) => void;
}

const ReceiptScanner: React.FC<ReceiptScannerProps> = ({ onDataExtracted }) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const extractDataFromText = (text: string): ExtractedData => {
    const lines = text.split('\n').filter((line) => line.trim());
    const data: ExtractedData = {};

    // Recherche du montant TTC (patterns français)
    const amountPatterns = [
      /(?:total|montant|ttc|net à payer|à payer)[\s:]*(\d+[,\s]?\d*\.?\d*)/i,
      /(\d+[,\s]\d{2})\s*(?:€|EUR|eur)/i,
      /(?:€|EUR)\s*(\d+[,\s]\d{2})/i,
    ];

    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        const amount = match[1].replace(/[,\s]/g, '.').replace(/[^\d.]/g, '');
        data.amount = parseFloat(amount);
        if (data.amount && !isNaN(data.amount)) break;
      }
    }

    // Recherche de la TVA
    const taxPatterns = [
      /(?:tva|taxe)[\s:]*(\d+[,\s]?\d*\.?\d*)/i,
      /(?:€|EUR)\s*(\d+[,\s]\d{2})\s*(?:tva|taxe)/i,
    ];

    for (const pattern of taxPatterns) {
      const match = text.match(pattern);
      if (match) {
        const tax = match[1].replace(/[,\s]/g, '.').replace(/[^\d.]/g, '');
        data.tax_amount = parseFloat(tax);
        if (data.tax_amount && !isNaN(data.tax_amount)) break;
      }
    }

    // Recherche de la date (formats français)
    const datePatterns = [
      /(\d{2}[-\/]\d{2}[-\/]\d{4})/,
      /(\d{2}\s+(?:janv|févr|mars|avr|mai|juin|juil|août|sept|oct|nov|déc)\w*\s+\d{4})/i,
      /(?:date|le)[\s:]*(\d{2}[-\/]\d{2}[-\/]\d{4})/i,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        const dateStr = match[1];
        try {
          // Convertir au format YYYY-MM-DD
          const parts = dateStr.split(/[-\/]/);
          if (parts.length === 3) {
            data.date = `${parts[2]}-${parts[1]}-${parts[0]}`;
            break;
          }
        } catch (e) {
          console.error('Error parsing date:', e);
        }
      }
    }

    // Recherche de numéro de facture
    const refPatterns = [
      /(?:facture|invoice|n°|no|ref)[\s:]*([A-Z0-9\-]+)/i,
      /([A-Z]{2,}\d{4,})/,
    ];

    for (const pattern of refPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.reference = match[1].trim();
        break;
      }
    }

    // Essayer d'extraire une description à partir des premières lignes
    if (lines.length > 0) {
      // Prendre la première ligne non-vide qui n'est pas juste des chiffres
      const descLine = lines.find(
        (line) => line.length > 3 && !/^\d+[,.\s]*$/.test(line)
      );
      if (descLine) {
        data.description = descLine.substring(0, 100);
      }
    }

    return data;
  };

  const processImage = async (uri: string) => {
    setLoading(true);
    setProgress(0);

    try {
      const worker = await createWorker('fra', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const {
        data: { text },
      } = await worker.recognize(uri);

      await worker.terminate();

      console.log('OCR Result:', text);

      const extractedData = extractDataFromText(text);
      console.log('Extracted Data:', extractedData);

      if (Object.keys(extractedData).length === 0) {
        Alert.alert(
          'Aucune donnée trouvée',
          'Impossible d\'extraire des informations. Veuillez remplir manuellement.'
        );
      } else {
        onDataExtracted(extractedData);
        Alert.alert('Succès', 'Données extraites de la facture !');
      }
    } catch (error) {
      console.error('OCR Error:', error);
      Alert.alert('Erreur', 'Impossible de lire la facture. Veuillez réessayer.');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const handleLaunchCamera = async () => {
    try {
      const result: ImagePickerResponse = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: false,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert('Erreur', result.errorMessage || 'Impossible d\'accéder à la caméra');
        return;
      }

      if (result.assets && result.assets[0]?.uri) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        await processImage(uri);
      }
    } catch (error) {
      console.error('Camera Error:', error);
      Alert.alert('Erreur', 'Impossible d\'accéder à la caméra');
    }
  };

  const handlePickDocument = async () => {
    if (Platform.OS === 'web') {
      // Sur le web, utiliser un input file HTML
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    } else if (DocumentPicker) {
      // Sur mobile, utiliser react-native-document-picker
      try {
        const result = await DocumentPicker.pick({
          type: [DocumentPicker.types.images],
          allowMultiSelection: false,
        });

        if (result && result[0]) {
          const uri = result[0].uri;
          setImageUri(uri);
          await processImage(uri);
        }
      } catch (error: any) {
        if (DocumentPicker.isCancel(error)) {
          // User cancelled
          return;
        }
        console.error('Document Picker Error:', error);
        Alert.alert('Erreur', 'Impossible de sélectionner le fichier');
      }
    }
  };

  const handleWebFileChange = async (event: any) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type - only accept images
      if (!file.type.startsWith('image/')) {
        Alert.alert(
          'Type de fichier non supporté',
          'Veuillez sélectionner uniquement des fichiers image (JPG, PNG, etc.). Les PDF ne sont pas supportés pour le moment.'
        );
        return;
      }

      const uri = URL.createObjectURL(file);
      setImageUri(uri);
      await processImage(uri);
    }
  };

  const showUploadOptions = () => {
    if (Platform.OS === 'web') {
      // Sur le web, seulement l'option de sélectionner un fichier
      handlePickDocument();
    } else if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Annuler', 'Prendre une photo', 'Choisir une photo'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await handleLaunchCamera();
          } else if (buttonIndex === 2) {
            await handlePickDocument();
          }
        }
      );
    } else {
      // Android: utiliser un menu personnalisé
      Alert.alert(
        'Scanner une facture',
        'Choisissez une option',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Prendre une photo', onPress: handleLaunchCamera },
          { text: 'Choisir une photo', onPress: handlePickDocument },
        ],
        { cancelable: true }
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Scanner une facture</Text>
      <Text style={styles.hint}>
        Prenez une photo ou sélectionnez une image pour extraire automatiquement les informations
      </Text>

      {imageUri && !loading && (
        <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F172A" />
          <Text style={styles.loadingText}>Analyse en cours... {progress}%</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, styles.scanButton]}
        onPress={showUploadOptions}
        disabled={loading}
      >
        <Text style={styles.buttonText}>📷 Scanner une facture</Text>
      </TouchableOpacity>

      {/* Input file caché pour le web */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef as any}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleWebFileChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  hint: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 12,
    lineHeight: 18,
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  scanButton: {
    backgroundColor: '#0F172A',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default ReceiptScanner;
