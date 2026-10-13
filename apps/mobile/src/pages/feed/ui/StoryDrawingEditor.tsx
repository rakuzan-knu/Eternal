import * as React from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { Check, Eraser, Highlighter, Pencil, Redo2, Trash2, Undo2, X } from 'lucide-react-native';
import type { DrawingOverlay, DrawingStroke } from '@social-network/shared-contracts';
import { clamp, makeOverlay, STORY_COLORS } from '../model/storyEditor';
import { IconButton, colors, common } from './primitives';
import { StoryDrawing } from './StoryDrawing';
import { StoryColorPicker, StoryRange } from './StoryToolPanel';

export function StoryDrawingEditor({
  initial,
  width,
  height,
  onSave,
  onClose,
}: {
  initial?: DrawingOverlay;
  width: number;
  height: number;
  onSave: (layer: DrawingOverlay) => void;
  onClose: () => void;
}) {
  const [strokes, setStrokes] = React.useState<DrawingStroke[]>(initial?.strokes || []);
  const [redo, setRedo] = React.useState<DrawingStroke[]>([]);
  const [tool, setTool] = React.useState<DrawingStroke['tool']>('pencil');
  const [color, setColor] = React.useState('#ffffff');
  const [size, setSize] = React.useState(6);
  const [settings, setSettings] = React.useState(false);
  const [limit, setLimit] = React.useState(false);
  const latest = React.useRef({ strokes, tool, color, size, width, height });
  latest.current = { strokes, tool, color, size, width, height };
  const draft = React.useRef<DrawingStroke | null>(null);
  const responder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const value = latest.current;
          if (
            value.strokes.length >= 128 ||
            value.strokes.reduce((n, stroke) => n + stroke.points.length, 0) >= 8000
          ) {
            setLimit(true);
            return;
          }
          const point = {
            x: clamp((event.nativeEvent.locationX / value.width) * 100, 0, 100),
            y: clamp((event.nativeEvent.locationY / value.height) * 100, 0, 100),
          };
          draft.current = {
            tool: value.tool,
            color: value.color,
            size: value.size,
            points: [point, { ...point }],
          };
          setStrokes([...value.strokes, draft.current]);
          setRedo([]);
        },
        onPanResponderMove: (event) => {
          const current = draft.current;
          if (!current || current.points.length >= 1024) return;
          const value = latest.current;
          const point = {
            x:
              Math.round(clamp((event.nativeEvent.locationX / value.width) * 100, 0, 100) * 100) /
              100,
            y:
              Math.round(clamp((event.nativeEvent.locationY / value.height) * 100, 0, 100) * 100) /
              100,
          };
          const previous = current.points.at(-1);
          if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < 0.2) return;
          draft.current = { ...current, points: [...current.points, point] };
          setStrokes(
            value.strokes.map((stroke, i) =>
              i === value.strokes.length - 1 ? draft.current || stroke : stroke,
            ),
          );
        },
        onPanResponderRelease: () => {
          draft.current = null;
        },
        onPanResponderTerminate: () => {
          draft.current = null;
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [],
  );
  const layer = React.useMemo(
    () => initial || makeOverlay({ type: 'drawing', strokes: [] }),
    [initial],
  );
  if (layer.type !== 'drawing') return null;
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 90 }]}>
      <View
        {...responder.panHandlers}
        accessibilityLabel="Story drawing canvas"
        style={StyleSheet.absoluteFill}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <StoryDrawing overlay={{ ...layer, strokes }} width={width} height={height} />
        </View>
      </View>
      <View style={s.toolbar}>
        <IconButton label="Cancel drawing" onPress={onClose}>
          <X color="white" size={21} />
        </IconButton>
        {(['pencil', 'marker', 'eraser'] as const).map((value) => {
          const Icon = value === 'pencil' ? Pencil : value === 'marker' ? Highlighter : Eraser;
          return (
            <IconButton
              key={value}
              label={`Drawing ${value}`}
              selected={tool === value}
              onPress={() => setTool(value)}
            >
              <Icon color={tool === value ? colors.purple : 'white'} size={20} />
            </IconButton>
          );
        })}
        <IconButton label="Save drawing" onPress={() => onSave({ ...layer, strokes })}>
          <Check color={colors.green} size={22} />
        </IconButton>
      </View>
      <View style={s.bottom}>
        {limit && (
          <Text accessibilityRole="alert" style={common.muted}>
            Drawing limit reached. Remove a stroke to keep editing.
          </Text>
        )}
        {settings && (
          <>
            <StoryColorPicker
              label="Brush color"
              colors={STORY_COLORS}
              value={color}
              onChange={setColor}
            />
            <StoryRange label="Brush size" value={size} min={2} max={30} onChange={setSize} />
          </>
        )}
        <View style={s.toolbar}>
          <IconButton
            label="Undo drawing"
            disabled={!strokes.length}
            onPress={() => {
              setRedo([...redo, strokes[strokes.length - 1]]);
              setStrokes(strokes.slice(0, -1));
              setLimit(false);
            }}
          >
            <Undo2 color="white" size={20} />
          </IconButton>
          <IconButton
            label="Redo drawing"
            disabled={!redo.length}
            onPress={() => {
              setStrokes([...strokes, redo[redo.length - 1]]);
              setRedo(redo.slice(0, -1));
            }}
          >
            <Redo2 color="white" size={20} />
          </IconButton>
          <IconButton
            label="Brush settings"
            selected={settings}
            onPress={() => setSettings(!settings)}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: color,
                borderWidth: 1,
                borderColor: '#fff',
              }}
            />
          </IconButton>
          <IconButton
            label="Clear drawing"
            disabled={!strokes.length}
            onPress={() => {
              setRedo([...strokes].reverse());
              setStrokes([]);
              setLimit(false);
            }}
          >
            <Trash2 color="white" size={20} />
          </IconButton>
        </View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: 10,
    borderRadius: 24,
    backgroundColor: '#0b0b12e6',
  },
  bottom: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: 22,
    backgroundColor: '#15151df0',
    padding: 4,
  },
});
