interface RangeSliderProps {
    label: string;
    min: number;
    max: number;
    step?: number;
    value: [number, number];
    onChange: (value: [number, number]) => void;
    formatValue?: (n: number) => string;
    histogramData?: number[];
    unit?: string;
    className?: string;
}
export declare function RangeSlider({ label, min, max, step, value, onChange, formatValue, histogramData, unit, className, }: RangeSliderProps): import("react/jsx-runtime").JSX.Element;
export {};
