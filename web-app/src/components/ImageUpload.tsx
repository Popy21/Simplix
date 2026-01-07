import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Platform, Alert } from 'react-native';
import { uploadService } from '../services/api';
import { toAbsoluteUrl } from '../utils/url';

interface ImageUploadProps {
  value?: string | string[];
  onChange: (urls: string | string[]) => void;
  multiple?: boolean;
  label?: string;
}

export default function ImageUpload({ value, onChange, multiple = false, label }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const images = Array.isArray(value) ? value : value ? [value] : [];

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      setUploading(true);

      if (multiple) {
        const uploadPromises = Array.from(files).map(file => uploadService.uploadImage(file));
        const results = await Promise.all(uploadPromises);
        const newUrls = results.map(r => r.data.url);
        onChange([...images, ...newUrls]);
      } else {
        const result = await uploadService.uploadImage(files[0]);
        onChange(result.data.url);
      }
    } catch (error) {
      console.error('Upload error:', error);
      if (Platform.OS === 'web') {
        alert('Erreur lors de l\'upload de l\'image');
      } else {
        Alert.alert('Erreur', 'Erreur lors de l\'upload de l\'image');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (index: number) => {
    if (multiple) {
      const newImages = images.filter((_, i) => i !== index);
      onChange(newImages);
    } else {
      onChange('');
    }
  };

  // Web-specific drag and drop handlers
  const handleDrag = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  if (Platform.OS !== 'web') {
    // Pour mobile, utiliser un simple bouton
    return (
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label}</Text>}

        {images.length > 0 && (
          <View style={styles.imagesGrid}>
            {images.map((url, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri: toAbsoluteUrl(url) }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemove(index)}
                >
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.uploadButton}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#007AFF" />
          ) : (
            <Text style={styles.uploadButtonText}>
              {images.length > 0 ? 'Ajouter une image' : 'Sélectionner une image'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // Pour le web avec drag & drop
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      {images.length > 0 && (
        <View style={styles.imagesGrid}>
          {images.map((url, index) => (
            <View key={index} style={styles.imageContainer}>
              <Image source={{ uri: toAbsoluteUrl(url) }} style={styles.image} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemove(index)}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          border: dragActive ? '2px dashed #007AFF' : '2px dashed #E5E5EA',
          borderRadius: 12,
          padding: 24,
          textAlign: 'center',
          backgroundColor: dragActive ? '#F0F8FF' : '#FFFFFF',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef as any}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={(e) => handleFileSelect(e.target.files)}
          style={{ display: 'none' }}
        />

        {uploading ? (
          <ActivityIndicator color="#007AFF" />
        ) : (
          <>
            <Text style={styles.dropzoneText}>📸</Text>
            <Text style={styles.dropzoneTitle}>
              Glissez-déposez {multiple ? 'des images' : 'une image'} ici
            </Text>
            <Text style={styles.dropzoneSubtitle}>
              ou cliquez pour sélectionner
            </Text>
          </>
        )}
      </div>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  uploadButtonText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },
  dropzoneText: {
    fontSize: 48,
    marginBottom: 8,
  },
  dropzoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  dropzoneSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
});
