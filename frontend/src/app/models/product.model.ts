export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  quality_rating?: number | null;
  stock?: number | null;
  specs_score?: number | null;
  image_url?: string;
  description?: string;
  source?: string | null;
  source_url?: string | null;
  currency?: string | null;
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
  context_profile?: string;
  active_criteria?: string[];
  ignored_criteria?: string[];
  effective_weights?: WeightVector;
  source_run_id?: string | null;
}

export interface SourceListing {
  external_id: string;
  title: string;
  category: string | null;
  brand: string | null;
  price: number;
  currency: string | null;
  rating: number | null;
  availability_reference: number | null;
  specs: Record<string, unknown> | null;
  source_url: string;
  content_hash: string;
  retrieved_at: string;
}

export interface SourceSearchResponse {
  run_id: string;
  provider: string;
  query: string;
  status: string;
  started_at: string;
  retrieved_at: string | null;
  duration_ms: number | null;
  error_code: string | null;
  metrics: {
    received: number;
    accepted: number;
    rejected: number;
    duplicates: number;
  };
  products: SourceListing[];
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
  context_profile?: string;
  source_run_id?: string | null;
  evaluated_at: string;
}
