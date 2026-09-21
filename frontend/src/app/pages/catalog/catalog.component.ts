import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="catalog-container">
      <div class="catalog-header">
        <div>
          <h2>Catálogo de Productos</h2>
          <p class="subtitle">Listado de productos disponibles para la comparación:</p>
        </div>
        <input
          type="text"
          placeholder="Buscar producto..."
          [(ngModel)]="searchQuery"
          class="search-box"
        />
      </div>

      <div class="products-list">
        @for (product of filteredProducts; track product.id) {
          <div class="card product-card">
            <div class="product-main">
              <div class="product-info">
                <h3>{{ product.name }}</h3>
                <span class="product-category">{{ product.category }} · {{ product.brand }}</span>
                <p class="product-desc">{{ product.description }}</p>
                <div class="product-meta">
                  <span><b>Calidad:</b> {{ product.quality_rating }} / 5</span>
                  <span><b>Stock:</b> {{ product.stock }} unid.</span>
                  <span><b>Specs:</b> {{ product.specs_score }}/100</span>
                </div>
              </div>
              <div class="product-price-box">
                <span class="price-val">{{ formatMoney(product.price) }}</span>
              </div>
            </div>
          </div>
        } @empty {
          <div class="card">
            <p>No se encontraron productos.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .catalog-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .catalog-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .subtitle {
      color: #64748b;
    }

    .search-box {
      padding: 0.45rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.9rem;
      width: 220px;
    }

    .products-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .product-card {
      margin-bottom: 0;
    }

    .product-main {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .product-info h3 {
      font-size: 1.05rem;
      margin-bottom: 0.2rem;
    }

    .product-category {
      font-size: 0.8rem;
      color: #64748b;
      display: block;
      margin-bottom: 0.4rem;
    }

    .product-desc {
      font-size: 0.88rem;
      color: #334155;
      margin-bottom: 0.4rem;
    }

    .product-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.825rem;
      color: #64748b;
    }

    .product-meta b {
      color: #1e293b;
    }

    .product-price-box {
      text-align: right;
      min-width: 100px;
    }

    .price-val {
      font-size: 1.25rem;
      font-weight: 700;
      color: #2563eb;
    }
  `]
})
export class CatalogComponent implements OnInit {
  products: Product[] = [];
  searchQuery: string = '';

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.apiService.getProducts().subscribe((data) => {
      this.products = data;
    });
  }

  get filteredProducts(): Product[] {
    if (!this.searchQuery.trim()) {
      return this.products;
    }
    const q = this.searchQuery.toLowerCase();
    return this.products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    );
  }

  formatMoney(amount: number): string {
    return '$' + amount.toLocaleString('es-CL');
  }
}
