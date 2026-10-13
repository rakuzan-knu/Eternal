import * as React from 'react';
import type { SliderProps } from '@react-native-community/slider';

// A native range input also supports keyboard and screen-reader adjustment on web.
export function MusicSlider(props: SliderProps) {
  return (
    <input
      type="range"
      aria-label={props.accessibilityLabel}
      aria-valuetext={props.accessibilityValue?.text}
      min={props.minimumValue ?? 0}
      max={props.maximumValue ?? 1}
      step={props.step || 'any'}
      value={props.value ?? 0}
      disabled={props.disabled}
      onChange={(event) => {
        const value = event.currentTarget.valueAsNumber;
        props.onValueChange?.(value);
        props.onSlidingComplete?.(value);
      }}
      style={{
        width: '100%',
        height: 44,
        margin: 0,
        cursor: props.disabled ? 'default' : 'pointer',
        accentColor:
          typeof props.minimumTrackTintColor === 'string' ? props.minimumTrackTintColor : '#bd86ff',
      }}
    />
  );
}
