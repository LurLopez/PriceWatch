import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { IonBadge, IonCard, IonCardContent, IonInput, IonNote } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonBadge,
    IonCard,
    IonCardContent,
    IonInput,
    IonNote,
  ],
  template: `
    <div class="catalog-container">
      <div class="catalog-header">
        <div>
          <h2>Catálogo de Productos</h2>
          <p class="subtitle">Listado de productos disponibles para la comparación:</p>
        </div>
        <ion-input
          class="search-box"
          type="search"
          [formControl]="searchControl"
          label="Buscar producto"
          labelPlacement="stacked"
          placeholder="Nombre, marca o categoría"
        ></ion-input>
      </div>

      <div class="products-list">
        @for (product of filteredProducts; track product.id) {
          <ion-card class="product-card">
            <ion-card-content>
              <div class="product-main">
                <div class="product-info">
                  <h3>{{ product.name }}</h3>
                  <div class="product-tags">
                    <ion-badge color="medium">{{ product.category }}</ion-badge>
                    <ion-badge color="primary">{{ product.brand }}</ion-badge>
                  </div>
                  <p class="product-desc">{{ product.description }}</p>
                  <div class="product-meta">
                    <span>
                      <b>Calidad:</b>
                      {{
                        product.quality_rating != null
                          ? product.quality_rating + ' / 5'
                          : 'No disponible'
                      }}
                    </span>
                    <span>
                      <b>Stock:</b>
                      {{ product.stock != null ? product.stock + ' unid.' : 'No disponible' }}
                    </span>
                    <span>
                      <b>Specs:</b>
                      {{
                        product.specs_score != null ? product.specs_score + '/100' : 'No disponible'
                      }}
                    </span>
                  </div>
                </div>
                <div class="product-price-box">
                  <span class="price-val">{{ formatMoney(product.price) }}</span>
                </div>
              </div>
            </ion-card-content>
          </ion-card>
        } @empty {
          <ion-card>
            <ion-card-content>
              <ion-note>No se encontraron productos.</ion-note>
            </ion-card-content>
          </ion-card>
        }
      </div>
    </div>
  `,
  styles: [
    `
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
        width: 260px;
      }

      .products-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .product-card {
        margin: 0;
      }

      .product-main {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
      }

      .product-info h3 {
        font-size: 1.05rem;
        margin-bottom: 0.35rem;
      }

      .product-tags {
        display: flex;
        gap: 0.35rem;
        margin-bottom: 0.4rem;
        flex-wrap: wrap;
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
        flex-wrap: wrap;
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

      @media (max-width: 640px) {
        .search-box {
          width: 100%;
        }

        .product-main {
          flex-direction: column;
          align-items: flex-start;
        }

        .product-price-box {
          text-align: left;
        }
      }
    `,
  ],
})
export class CatalogComponent implements OnInit {
  products: Product[] = [];
  readonly searchControl = new FormControl('', { nonNullable: true });

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.apiService.getProducts().subscribe((data) => {
      this.products = data;
    });
  }

  get filteredProducts(): Product[] {
    const query = this.searchControl.value.trim().toLowerCase();
    if (!query) {
      return this.products;
    }
    return this.products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query),
    );
  }

  formatMoney(amount: number): string {
    return '$' + amount.toLocaleString('es-CL');
  }
}
