import type { WaferMapColorMode } from '../hooks/useWaferMapRenderer';
interface ColorModeSelectorProps {
    value: WaferMapColorMode;
    onChange: (mode: WaferMapColorMode) => void;
}
export declare function ColorModeSelector({ value, onChange }: ColorModeSelectorProps): import("react/jsx-runtime").JSX.Element;
export {};
