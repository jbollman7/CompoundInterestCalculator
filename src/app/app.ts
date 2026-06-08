import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MyChart } from './mychart/mychart';


@Component({
  selector: 'app-root',
  imports: [ MyChart],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.css'
})
export class App {}
