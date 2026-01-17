import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProductGrid } from "../components/demo/ProductGrid";
import { toast } from "sonner";
import { DashboardLayout } from '@/components/layout/DashboardLayout';  
import type { Product } from "../types";
import { addCartItem } from "../lib/storage";

type ShopifyProduct = {
  id: string;
  title: string;
  vendor: string;
  productType: string;
  tags: string[];
  images: string[];
  variants: { id: string; title: string; price: number }[];
  inStock?: boolean;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const FALLBACK_IMAGE = "https://placehold.co/600x400?text=Product";

export default function WebStore() {

    const {
        data: products,
        isLoading,
        isError,
        error,
    } = useQuery<Product[]>({
        queryKey: ["shopify-products"],
        queryFn: async (): Promise<Product[]> => {
            const response = await fetch(`${API_BASE}/api/shopify/products/search`);
            if (!response.ok) {
                throw new Error("Failed to load products");
            }
            const data = (await response.json()) as ShopifyProduct[];
            return data.map((product) => ({
                id: product.id,
                title: product.title,
                price: product.variants?.[0]?.price ?? 0,
                imageUrl: product.images?.[0] ?? FALLBACK_IMAGE,
                tags: product.tags ?? [],
                productType: product.productType,
                vendor: product.vendor,
                inStock: product.inStock ?? true,
            }));
        },
    });

    useEffect(() => {
        if (isError) {
            const message = error instanceof Error ? error.message : "Could not load products.";
            toast.error(message);
        }
    }, [isError, error]);

    const handleAddToCart = (product: Product) => {
        addCartItem({
            id: product.id,
            title: product.title,
            price: product.price,
            qty: 1,
            imageUrl: product.imageUrl,
            tags: product.tags,
            productType: product.productType,
            vendor: product.vendor,
            inStock: product.inStock,
        });
        toast.success("Added to checkout", { description: product.title });
    };

    return (
        <DashboardLayout> 
            <div className="max-w-7xl mx-auto p-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Welcome to Our Store!
                    </h1>
                </div>

                {isLoading ? (
                    <p className="text-gray-600">Loading products...</p>
                ) : (
                    <ProductGrid products={products ?? []} onAddToCart={handleAddToCart} />
                )}
            </div>
        </DashboardLayout> 
	);
}
