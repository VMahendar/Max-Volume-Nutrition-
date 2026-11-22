import {api,money} from './commerce-api.js';

const panel = document.getElementById('tradeOrders');
const form = document.getElementById('tradeOrderForm');
const packs = document.getElementById('tradePacks');
const history = document.getElementById('tradeHistory');
const total = document.getElementById('tradeTotal');
const message = document.getElementById('tradeOrderMessage');
const labels = {received:'Request received',confirmed:'Confirmed',dispatched:'Dispatched',delivered:'Delivered',cancelled:'Cancelled'};
const inputs = new Map();
let requestKey;
let generation = 0;

function make(tag,text) {
 const node = document.createElement(tag);
 if (text !== undefined) node.textContent = text;
 return node;
}

export function clearTradeOrders() {
 generation++;
 panel.hidden = true;
 packs.replaceChildren();
 history.replaceChildren();
 message.replaceChildren();
 inputs.clear();
 requestKey = undefined;
}

function selection() {
 return [...inputs].filter(([, {field}]) => Number(field.value) > 0)
  .map(([variantId, {field}]) => ({variantId,quantity:Number(field.value)}));
}

function updateTotal() {
 const subtotal = selection().reduce((sum, {variantId,quantity}) => sum + inputs.get(variantId).price * quantity, 0);
 total.textContent = 'Trade subtotal: ' + money(subtotal);
}

function whatsappLink(order) {
  const text = ['Hello Max Volume Nutrition, please confirm my trade order request '+order.id+'.',
   ...order.lines.map(line => line.product+' · '+line.pack+' × '+line.quantity),
   'Trade subtotal: '+money(order.totalBeforeOffersPaise)].join('\n');
  const whatsapp = make('a','Continue on WhatsApp');
  whatsapp.href = 'https://wa.me/917708830513?text='+encodeURIComponent(text);
  whatsapp.target = '_blank';
  whatsapp.rel = 'noopener noreferrer';
  return whatsapp;
}

function renderHistory(orders) {
 history.replaceChildren();
 if (!orders.length) history.append(make('p','Your saved trade requests will appear here.'));
 for (const order of orders) {
  const entry = make('details');
  entry.append(make('summary',order.id+' · '+labels[order.status]+' · '+money(order.totalBeforeOffersPaise)));
  const items = make('ul');
  for (const line of order.lines) items.append(make('li',line.product+' · '+line.pack+' × '+line.quantity));
  const reorder = make('button','Use items in a new request');
  reorder.type = 'button';
  reorder.onclick = () => {
   if (form.querySelector('button[type="submit"]').disabled) return;
   form.reset();
   let adjusted = false;
   for (const line of order.lines) {
    const pack = inputs.get(line.variantId);
    if (pack) pack.field.value = Math.min(Number(pack.field.max),line.quantity);
    if (!pack || Number(pack.field.value) !== line.quantity) adjusted = true;
   }
   requestKey = undefined;
   updateTotal();
   message.textContent = adjusted ? 'Some quantities changed with current availability. Review your selection.' : 'Review the quantities and current prices before saving.';
   form.scrollIntoView({block:'start'});
  };
  entry.append(items,reorder);
  if (order.status === 'received') entry.append(whatsappLink(order));
  history.append(entry);
 }
}

export async function loadTradeOrders() {
 const current = generation;
 const [catalogue,{orders},availability] = await Promise.all([api('/api/dealer/catalog'),api('/api/dealer/orders'),api('/api/order-message-availability')]);
 if (current !== generation) return;
 for (const product of catalogue.products) {
  for (const variant of product.variants) {
   if (!Number.isSafeInteger(variant.pricePaise) || variant.pricePaise <= 0 || variant.stock === 0) continue;
   const label = make('label',product.name+' · '+variant.label+' · '+money(variant.pricePaise));
   const field = make('input');
   field.type = 'number';
   field.min = '0';
   field.max = String(Math.min(100,variant.stock ?? 100));
   field.step = '1';
   field.value = '0';
   field.defaultValue = '0';
   field.inputMode = 'numeric';
   label.append(field);
   packs.append(label);
   inputs.set(variant.id,{field,price:variant.pricePaise});
  }
 }
 document.getElementById('tradeWhatsappChoice').hidden = availability.whatsapp!==true;
 form.hidden = !inputs.size;
 if (!inputs.size) message.textContent = 'No trade packs are currently available.';
 updateTotal();
 renderHistory(orders);
 panel.hidden = false;
}

form.addEventListener('input', () => {
 requestKey = undefined;
 updateTotal();
});
form.addEventListener('submit', async event => {
 event.preventDefault();
 const items = selection();
 if (!items.length) {
  message.textContent = 'Select at least one pack.';
  return;
 }
 const current = generation;
 const button = form.querySelector('button[type="submit"]');
 button.disabled = true;
 for (const {field} of inputs.values()) field.disabled = true;
 message.textContent = 'Saving your order request…';
 try {
  requestKey ||= crypto.randomUUID();
  const order = await api('/api/dealer/orders',{requestKey,items,orderWhatsappOptIn:document.getElementById('tradeWhatsappOptIn').checked});
  if (current !== generation) return;
  const whatsapp = whatsappLink({id:order.id,...order.detail});
  message.replaceChildren('Saved '+order.id+'. ',whatsapp);
  form.reset();
  requestKey = undefined;
  updateTotal();
  try {
   const {orders} = await api('/api/dealer/orders');
   if (current === generation) renderHistory(orders);
  } catch {}
 } catch (error) {
  if (current === generation) message.textContent = error.message;
 } finally {
  button.disabled = false;
  if (current === generation) for (const {field} of inputs.values()) field.disabled = false;
 }
});
