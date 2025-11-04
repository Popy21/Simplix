import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import logger from '../../utils/logger';

type DraggableProps = {
  children: React.ReactNode;
  payload: string;
  style?: any;
  draggingStyle?: any;
  onDragStart?: () => void;
  onDragEnd?: () => void;
};

type DroppableProps = {
  children: React.ReactNode;
  style?: any;
  activeStyle?: any;
  onActiveChange?: (active: boolean) => void;
  onReceive: (payload: string) => void;
};

const isWeb = Platform.OS === 'web';

let NativeDrax: { DraxProvider: React.ComponentType<any>; DraxView: React.ComponentType<any> } | null = null;
if (!isWeb) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    NativeDrax = require('react-native-drax');
  } catch (error) {
    console.warn('Drag and drop native module unavailable, falling back to basic interactions.', error);
    NativeDrax = null;
  }
}

const supportsNativeDnd = !isWeb && !!NativeDrax;

export const useSupportsDnd = () => supportsNativeDnd;

export const MaybeDraxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!supportsNativeDnd || !NativeDrax) {
    return <>{children}</>;
  }

  const Provider = NativeDrax.DraxProvider;
  return <Provider>{children}</Provider>;
};

export const MaybeDraxDraggable: React.FC<DraggableProps> = ({
  children,
  payload,
  style,
  draggingStyle,
  onDragStart,
  onDragEnd,
}) => {
  if (supportsNativeDnd && NativeDrax) {
    const Draggable = NativeDrax.DraxView;
    return (
      <Draggable
        style={style}
        payload={payload}
        draggingStyle={draggingStyle}
        dragReleasedStyle={draggingStyle}
        hoverDraggingStyle={draggingStyle}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        {children}
      </Draggable>
    );
  }

  const [dragging, setDragging] = useState(false);
  const dragRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (!dragRef.current) return;

    const element = dragRef.current;

    // Set draggable attribute on the actual DOM element
    if (element && typeof element.setAttribute === 'function') {
      element.setAttribute('draggable', 'true');
    }

    const handleDragStart = (event: DragEvent) => {
      // Check if we're clicking on a button or non-draggable element
      const target = event.target as HTMLElement;
      const isButton =
        (typeof target.closest === 'function' && target.closest('button')) ||
        target.tagName === 'BUTTON' ||
        (typeof target.closest === 'function' && target.closest('[data-no-drag]')) ||
        target.hasAttribute('data-no-drag') ||
        target.getAttribute('role') === 'button';

      if (isButton) {
        logger.warn('DRAG', 'Drag prevented - clicked on interactive element', {
          payload,
          targetTag: target.tagName,
          role: target.getAttribute('role'),
        });
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      logger.dragStart('MaybeDraxDraggable', { payload });
      setDragging(true);
      onDragStart?.();
      event.dataTransfer!.effectAllowed = 'move';
      event.dataTransfer!.setData('application/x-payload', payload);
    };

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isButton =
        target.closest('button') ||
        target.tagName === 'BUTTON' ||
        target.closest('[data-no-drag]') ||
        target.hasAttribute('data-no-drag') ||
        target.getAttribute('role') === 'button';

      if (isButton) {
        logger.debug('DRAG', 'MouseDown on button - preventing drag', {
          payload,
          targetTag: target.tagName,
        });
        // Temporarily disable dragging
        element.setAttribute('draggable', 'false');
        // Re-enable after a short delay
        setTimeout(() => {
          if (element) {
            element.setAttribute('draggable', 'true');
          }
        }, 100);
      }
    };

    const handleDragEnd = () => {
      logger.dragEnd('MaybeDraxDraggable', { payload });
      setDragging(false);
      onDragEnd?.();
    };

    element.addEventListener('dragstart', handleDragStart);
    element.addEventListener('dragend', handleDragEnd);
    element.addEventListener('mousedown', handleMouseDown);

    return () => {
      element.removeEventListener('dragstart', handleDragStart);
      element.removeEventListener('dragend', handleDragEnd);
      element.removeEventListener('mousedown', handleMouseDown);
    };
  }, [payload, onDragStart, onDragEnd]);

  return (
    <View
      ref={dragRef}
      style={[
        style,
        {
          cursor: dragging ? 'grabbing' : 'grab',
          opacity: dragging ? 0.5 : 1,
        },
      ]}
    >
      {children}
    </View>
  );
};

export const MaybeDraxDroppable: React.FC<DroppableProps> = ({
  children,
  style,
  activeStyle,
  onActiveChange,
  onReceive,
}) => {
  if (supportsNativeDnd && NativeDrax) {
    const Droppable = NativeDrax.DraxView;
    return (
      <Droppable
        receptive
        style={style}
        receivingStyle={activeStyle}
        onReceiveDragEnter={() => {
          onActiveChange?.(true);
        }}
        onReceiveDragExit={() => {
          onActiveChange?.(false);
        }}
        onReceiveDragDrop={({ dragged }: { dragged?: { payload?: string } }) => {
          onActiveChange?.(false);
          const payload = dragged?.payload;
          if (typeof payload === 'string') {
            onReceive(payload);
          }
        }}
      >
        {children}
      </Droppable>
    );
  }

  const [active, setActive] = useState(false);
  const dropZoneRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (!dropZoneRef.current) return;

    const element = dropZoneRef.current;

    const handleDragEnter = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      logger.dragEnter('MaybeDraxDroppable', 'Drop zone');
      setActive(true);
      onActiveChange?.(true);
    };

    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer!.dropEffect = 'move';
    };

    const handleDragLeave = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      // Only deactivate if we're leaving the drop zone itself, not a child
      if (element && !element.contains(event.relatedTarget)) {
        logger.dragLeave('MaybeDraxDroppable', 'Drop zone');
        setActive(false);
        onActiveChange?.(false);
      }
    };

    const handleDrop = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const payload = event.dataTransfer?.getData('application/x-payload');
      logger.drop('MaybeDraxDroppable', payload, 'Drop zone');
      setActive(false);
      onActiveChange?.(false);
      if (payload) {
        logger.success('DRAG', 'Payload received, calling onReceive', { payload });
        onReceive(payload);
      } else {
        logger.error('DRAG', 'No payload received on drop');
      }
    };

    element.addEventListener('dragenter', handleDragEnter);
    element.addEventListener('dragover', handleDragOver);
    element.addEventListener('dragleave', handleDragLeave);
    element.addEventListener('drop', handleDrop);

    return () => {
      element.removeEventListener('dragenter', handleDragEnter);
      element.removeEventListener('dragover', handleDragOver);
      element.removeEventListener('dragleave', handleDragLeave);
      element.removeEventListener('drop', handleDrop);
    };
  }, [onReceive, onActiveChange]);

  return (
    <View ref={dropZoneRef} style={[style, active && activeStyle]}>
      {children}
    </View>
  );
};

export default {
  MaybeDraxProvider,
  MaybeDraxDraggable,
  MaybeDraxDroppable,
  useSupportsDnd,
};
