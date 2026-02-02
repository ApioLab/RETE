import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, FileText, CheckCircle, AlertCircle, X } from "lucide-react";

interface CSVRow {
  email: string;
  amount: number;
  valid: boolean;
  error?: string;
}

interface CSVUploadProps {
  onUpload: (data: CSVRow[]) => void;
  title?: string;
}

export function CSVUpload({ onUpload, title = "Carica Fondi CSV" }: CSVUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [allData, setAllData] = useState<CSVRow[]>([]);
  const [previewData, setPreviewData] = useState<CSVRow[]>([]);
  const [isValid, setIsValid] = useState(false);

  const parseCSV = (text: string): CSVRow[] => {
    const lines = text.trim().split("\n");
    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const [email, amountStr] = lines[i].split(",").map((s) => s.trim());
      const amount = parseFloat(amountStr);
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      const amountValid = !isNaN(amount) && amount > 0;

      rows.push({
        email,
        amount: amountValid ? amount : 0,
        valid: emailValid && amountValid,
        error: !emailValid
          ? "Email non valida"
          : !amountValid
          ? "Importo non valido"
          : undefined,
      });
    }

    return rows;
  };

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setAllData(parsed);
      setPreviewData(parsed.slice(0, 5));
      setIsValid(parsed.every((row) => row.valid));
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleClear = () => {
    setFileName(null);
    setAllData([]);
    setPreviewData([]);
    setIsValid(false);
  };

  const handleSubmit = () => {
    if (isValid && allData.length > 0) {
      onUpload(allData);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!fileName ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              Trascina qui il file CSV o
            </p>
            <label>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleInputChange}
                data-testid="input-csv-file"
              />
              <Button variant="outline" size="sm" asChild>
                <span className="cursor-pointer">Sfoglia file</span>
              </Button>
            </label>
            <p className="text-xs text-muted-foreground mt-3">
              Formato: email, importo
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium text-sm">{fileName}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClear}
                data-testid="button-clear-csv"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {previewData.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Importo</TableHead>
                      <TableHead className="w-24">Stato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, i) => (
                      <TableRow key={i} data-testid={`csv-row-${i}`}>
                        <TableCell className="font-mono text-sm">
                          {row.email}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.amount.toLocaleString("it-IT")} ECT
                        </TableCell>
                        <TableCell>
                          {row.valid ? (
                            <Badge className="bg-success/20 text-success border-0">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              OK
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Errore
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {allData.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center py-2 border-t">
                    ... e altre {allData.length - 5} righe ({allData.length} totali)
                  </p>
                )}
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={!isValid}
              data-testid="button-submit-csv"
            >
              Conferma Distribuzione ({allData.length} utenti)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
