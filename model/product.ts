export interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  count: number;
}

export interface ProductData {
  id: string;
  title: string;
  description?: string;
  price: number;
}

export interface Stock {
  product_id: string;
  count: number;
}
