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
