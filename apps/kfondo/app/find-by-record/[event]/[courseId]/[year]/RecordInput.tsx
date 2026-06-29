"use client";
import type { FC } from "react";
import { Button } from "@/components/ui/button";

export type RecordInputProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  onSubmit?: () => void;
  label?: string;
  placeholder?: string;
};

const isValidRecordFormat = (value: string) => {
  // 허용: HH:mm:ss 또는 HH:mm:ss.SS
  return /^\d{2}:\d{2}:\d{2}(\.\d{1,2})?$/.test(value);
};

const formatRecordInput = (value: string) => {
  // 숫자만 입력된 경우 자동 포맷팅 (50827 → 05:08:27)
  const digits = value.replace(/[^\d]/g, "");
  if (digits.length === 6) {
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4, 6)}`;
  }
  if (digits.length === 8) {
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(
      4,
      6
    )}.${digits.slice(6, 8)}`;
  }
  return value;
};

const RecordInput: FC<RecordInputProps> = ({
  value,
  onChange,
  error,
  onSubmit,
  label = "기록 입력",
  placeholder = "예: 05:08:27 또는 05:08:27.53",
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value;
    v = formatRecordInput(v);
    onChange(v);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) onSubmit();
  };

  return (
    <form
      className="max-w-xs mx-auto my-16"
      autoComplete="off"
      onSubmit={handleFormSubmit}
    >
      <label htmlFor="record-input" className="block text-sm font-medium mb-2">
        {label}
      </label>
      <input
        id="record-input"
        name="record"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        className="w-full border rounded px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={value}
        onChange={handleInputChange}
      />
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      <Button type="submit" className="w-full mt-4">
        기록 찾기
      </Button>
    </form>
  );
};

export { isValidRecordFormat, formatRecordInput };
export default RecordInput;
