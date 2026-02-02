import { CSVUpload } from "../CSVUpload";

export default function CSVUploadExample() {
  return (
    <div className="w-full max-w-lg">
      <CSVUpload onUpload={(data) => console.log("CSV uploaded:", data)} />
    </div>
  );
}
