import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProductGrid } from "../components/demo/ProductGrid";
import { toast } from "sonner";
import { DashboardLayout } from '@/components/layout/DashboardLayout';  
import type { Product } from "../types";
import { addCartItem } from "../lib/storage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

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
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("all");
    const [vendor, setVendor] = useState("all");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [inStockOnly, setInStockOnly] = useState(false);
    const [sort, setSort] = useState("featured");

    const {
        data: products,
        isLoading,
        isError,
        error,
    } = useQuery<Product[]>({
        queryKey: ["shopify-products"],
        queryFn: async (): Promise<Product[]> => {
            const response = await fetch(`${API_BASE}/api/shopify/products/search?limit=500`);
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

    const categories = useMemo(() => {
        const set = new Set((products ?? []).map((product) => product.productType).filter(Boolean));
        return ["all", ...Array.from(set).sort()];
    }, [products]);

    const vendors = useMemo(() => {
        const set = new Set((products ?? []).map((product) => product.vendor).filter(Boolean));
        return ["all", ...Array.from(set).sort()];
    }, [products]);

    const filteredProducts = useMemo(() => {
        const min = minPrice ? Number(minPrice) : undefined;
        const max = maxPrice ? Number(maxPrice) : undefined;
        let results = (products ?? []).filter((product) => {
            const matchesSearch = search.trim()
                ? product.title.toLowerCase().includes(search.toLowerCase()) ||
                    product.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase())) ||
                    product.vendor.toLowerCase().includes(search.toLowerCase())
                : true;
            const matchesCategory = category === "all" ? true : product.productType === category;
            const matchesVendor = vendor === "all" ? true : product.vendor === vendor;
            const matchesStock = inStockOnly ? product.inStock : true;
            const matchesMin = typeof min === "number" ? product.price >= min : true;
            const matchesMax = typeof max === "number" ? product.price <= max : true;
            return matchesSearch && matchesCategory && matchesVendor && matchesStock && matchesMin && matchesMax;
        });

        switch (sort) {
            case "price-asc":
                results = [...results].sort((a, b) => a.price - b.price);
                break;
            case "price-desc":
                results = [...results].sort((a, b) => b.price - a.price);
                break;
            case "name":
                results = [...results].sort((a, b) => a.title.localeCompare(b.title));
                break;
            default:
                break;
        }

        return results;
    }, [products, search, category, vendor, minPrice, maxPrice, inStockOnly, sort]);

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

    const clearFilters = () => {
        setSearch("");
        setCategory("all");
        setVendor("all");
        setMinPrice("");
        setMaxPrice("");
        setInStockOnly(false);
        setSort("featured");
    };

    return (
        <DashboardLayout> 
            <div className="max-w-7xl mx-auto p-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Welcome to Our Store!
                    </h1>
                    <p className="text-muted-foreground">
                        Browse our curated catalog and add items to your checkout.
                    </p>
                </div>

                <div className="rounded-xl border bg-card p-4 mb-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                            placeholder="Search products, tags, or brands"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <div className="flex gap-3">
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                {categories.map((item) => (
                                    <option key={item} value={item}>
                                        {item === "all" ? "All categories" : item}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={vendor}
                                onChange={(e) => setVendor(e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                {vendors.map((item) => (
                                    <option key={item} value={item}>
                                        {item === "all" ? "All brands" : item}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-3">
                            <Input
                                type="number"
                                min={0}
                                placeholder="Min price"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                            />
                            <Input
                                type="number"
                                min={0}
                                placeholder="Max price"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="in-stock"
                                    checked={inStockOnly}
                                    onCheckedChange={(checked) => setInStockOnly(checked)}
                                />
                                <label htmlFor="in-stock" className="text-sm text-muted-foreground">
                                    In stock only
                                </label>
                            </div>
                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value)}
                                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="featured">Featured</option>
                                <option value="price-asc">Price: Low to High</option>
                                <option value="price-desc">Price: High to Low</option>
                                <option value="name">Name</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary">{filteredProducts.length} results</Badge>
                            <Button variant="ghost" onClick={clearFilters}>
                                Clear filters
                            </Button>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <p className="text-gray-600">Loading products...</p>
                ) : (
                    <ProductGrid products={filteredProducts} onAddToCart={handleAddToCart} />
                )}
            </div>
        </DashboardLayout> 
	);
}
