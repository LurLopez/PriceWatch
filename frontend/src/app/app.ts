import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IonApp } from '@ionic/angular';
import { NavbarComponent } from './components/navbar/navbar.component';
import { ConnectivityService } from './services/connectivity.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, IonApp],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly connectivity = inject(ConnectivityService);
}
