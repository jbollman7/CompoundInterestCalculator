import { Component } from '@angular/core';
import { MyChart } from './mychart/mychart';


@Component({
  selector: 'app-root',
  imports: [ MyChart],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
