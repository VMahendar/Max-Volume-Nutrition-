import {api} from './commerce-api.js';

const form = document.getElementById('trackOrder');
const input = document.getElementById('trackingLink');
const result = document.getElementById('trackingResult');
const labels = {received:'Request received',confirmed:'Confirmed',dispatched:'Dispatched',delivered:'Delivered',cancelled:'Cancelled'};

async function track() {
 const button = form.querySelector('button');
 button.disabled = true;
 result.hidden = false;
 result.textContent = 'Checking your order status…';
 try {
  const url = new URL(input.value, location.origin);
  const match = url.hash.match(/^#(MVN-LEAD-[A-F0-9-]{12})\.([a-f0-9]{64})$/);
  if (url.origin !== location.origin || url.pathname !== '/track-order.html' || !match) {
   throw Error('Enter a valid private tracking link from Max Volume Nutrition.');
  }
  const order = await api('/api/track-order', {id:match[1],token:match[2]});
  result.textContent = order.id + ' · ' + labels[order.status];
 } catch (error) {
  result.textContent = error.message;
 } finally {
  button.disabled = false;
 }
}
form.addEventListener('submit', event => {
 event.preventDefault();
 void track();
});
if (location.hash) {
 input.value = location.href;
 void track();
} else {
 try {
  input.value = localStorage.getItem('mvn-last-tracking-link') || '';
 } catch {}
}
