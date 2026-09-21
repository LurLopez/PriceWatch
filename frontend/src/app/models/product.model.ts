export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  quality_rating: number;
  stock: number;
  specs_score: number;
  image_url?: string;
  description?: string;
}

export interface WeightVector {
  weight_price: number;
  weight_quality: number;
  weight_stock: number;
  weight_specs: number;
}

export interface ScoreBreakdown {
  normalized_price: number;
  normalized_quality: number;
  normalized_stock: number;
  normalized_specs: number;
  weighted_price_contribution: number;
  weighted_quality_contribution: number;
  weighted_stock_contribution: number;
  weighted_specs_contribution: number;
}

export interface RankedProduct extends Product {
  rank_position: number;
  final_score: number;
  level: string;
  breakdown?: ScoreBreakdown;
  reasons?: string[];
}

export interface EvaluationResponse {
  status: string;
  total_products_evaluated: number;
  top_recommended_product_id: string;
  global_explanation: string;
  warnings: string[];
  ranking: RankedProduct[];
}

export interface EvaluationHistoryItem {
  id: string;
  weight_price: number;
  weight_quality: number;
  weight_stock: number;
  weight_specs: number;
  top_product_id: string;
  top_product_name: string;
  top_product_score: number;
  explanation: string;
  evaluated_at: string;
}
