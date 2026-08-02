// components/flow/PrintButton.tsx
"use client";

export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn">
      Udskriv / gem som PDF
    </button>
  );
}
