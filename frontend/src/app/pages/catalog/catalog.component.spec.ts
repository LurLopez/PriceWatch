import { of } from 'rxjs';
import { vi } from 'vitest';
import { ApiService } from '../../services/api.service';
import { Product } from '../../models/product.model';
import { CatalogComponent } from './catalog.component';

const products: Product[] = [
  {
    id: '1',
    name: 'ThinkPad Pro',
    category: 'Laptops',
    brand: 'Lenovo',
    price: 1200,
    quality_rating: 4.8,
    stock: 5,
    specs_score: 90,
  },
  {
    id: '2',
    name: 'MacBook Air',
    category: 'Laptops',
    brand: 'Apple',
    price: 1100,
    quality_rating: 4.9,
    stock: 3,
    specs_score: 88,
  },
];

describe('CatalogComponent', () => {
  function createComponent() {
    const api = {
      getProducts: vi.fn().mockReturnValue(of(products)),
    } as unknown as ApiService;
    return new CatalogComponent(api);
  }

  it('carga el catálogo al iniciar', () => {
    const component = createComponent();
    component.ngOnInit();
    expect(component.products).toHaveLength(2);
    expect(component.filteredProducts).toHaveLength(2);
  });

  it('filtra con un FormControl reactivo por nombre, marca o categoría', () => {
    const component = createComponent();
    component.ngOnInit();

    component.searchControl.setValue('lenovo');
    expect(component.filteredProducts.map((p) => p.name)).toEqual(['ThinkPad Pro']);

    component.searchControl.setValue('Apple');
    expect(component.filteredProducts.map((p) => p.name)).toEqual(['MacBook Air']);

    component.searchControl.setValue('laptops');
    expect(component.filteredProducts).toHaveLength(2);
  });

  it('devuelve todos los productos cuando la búsqueda está vacía', () => {
    const component = createComponent();
    component.ngOnInit();
    component.searchControl.setValue('   ');
    expect(component.filteredProducts).toHaveLength(2);
  });
});
