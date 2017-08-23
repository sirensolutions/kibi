import { Notifier } from 'kibie/notify/notifier'; // kibi: import Kibi notifier

export function CourierNotifierProvider() {
  return new Notifier({
    location: 'Courier Fetch'
  });
}
