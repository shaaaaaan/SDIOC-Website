import {Component, signal} from '@angular/core';
import {data} from '../../data/contact.json';

export interface ContactUsData {
  location: ContactLocation,
  phones: ContactPhone[],
  emails: ContactEmail[]
}

export interface ContactLocation {
  address: string,
  poBox: string
}

export interface ContactPhone {
  label: string,
  number: string
}

export interface ContactEmail {
  label: string,
  address: string
}
@Component({
  standalone: true,
  selector: 'app-contact-us',
  imports: [],
  templateUrl: './contact-us.html'
})
export class ContactUs {
  contactInfo = signal<ContactUsData>(data);
}
