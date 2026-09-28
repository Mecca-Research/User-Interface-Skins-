export function HueSlider({
  hue,
  onChange,
}: {
  hue: number;
  onChange: (hue: number) => void;
}) {
  return (
    <input
      type="range"
      min={0}
      max={360}
      value={Math.round(hue)}
      onChange={(e) => onChange(Number(e.target.value))}
      className="hue-range"
      aria-label="Color spectrum"
    />
  );
}

export function TransparencySlider({
  opacity,
  onChange,
}: {
  opacity: number;
  onChange: (opacity: number) => void;
}) {
  return (
    <input
      type="range"
      min={8}
      max={96}
      value={Math.round(opacity * 100)}
      onChange={(e) => onChange(Number(e.target.value) / 100)}
      className="alpha-range"
      aria-label="Window transparency"
    />
  );
}
