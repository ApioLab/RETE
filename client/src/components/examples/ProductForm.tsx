import { ProductForm } from "../ProductForm";

export default function ProductFormExample() {
  return (
    <div className="w-full max-w-lg">
      <ProductForm
        onSubmit={async (data) => {
          console.log("Product submitted:", data);
          await new Promise((r) => setTimeout(r, 500));
        }}
        onCancel={() => console.log("Cancelled")}
      />
    </div>
  );
}
