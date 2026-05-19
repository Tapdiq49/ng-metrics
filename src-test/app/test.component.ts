import { Component, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-test',
  template: '<div></div>'
})
export class TestComponent {
  @ViewChild('myRef', { static: true }) myRef!: any;

  constructor(private http: HttpClient) {}

  getData() {
    this.http.get('/api/data').subscribe(res => {
      this.http.get('/api/more').subscribe(more => {
        console.log(more);
      });
    });
  }

  getPromiseData() {
    return this.http.get('/api/data').toPromise();
  }
}
