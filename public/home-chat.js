(() => {
 const launcher = document.querySelector('#mvn-chat-open');
 const dialog = document.querySelector('#mvn-chat');
 const log = dialog.querySelector('[role="log"]');
 const form = dialog.querySelector('form');
 const input = form.elements.question;
 const call = dialog.querySelector('footer');
 const topics = [
  [/wholesale|dealer|trainer|gym owner|distribut/i, 'For gym, trainer and shop supply, tell us what you need through our wholesale enquiry page.', 'Wholesale enquiry', '/dealer.html'],
  [/deliver|shipp|courier|pincode|dispatch|டெலிவரி/i, 'We confirm delivery availability and charges for your location when we review your order. Call us if you want to check before ordering.'],
  [/payment|pay|koduk|cod|cash|upi|razorpay|order|checkout/i, 'Add your packs to the cart and send your order request through checkout. Our team confirms it on WhatsApp. Online payment is currently unavailable.', 'Shop products', '/shop.html'],
  [/whey|isolate|protein|creatine|gainer|nitro|sturdy|workout|vitamin|musclevite|vilai|விலை|price|cost|stock|flavo[u]?r|product|supplement/i, 'Our shop shows the current pack sizes, flavours and retail prices. For live stock or help comparing packs, call our team.', 'Browse products', '/shop.html'],
  [/kelambakkam|address|location|where|hours|timing|contact/i, 'Max Volume Nutrition serves customers in Kelambakkam and Chennai. Call us for location and availability details.'],
  [/^(hi|hello|hey|vanakkam|வணக்கம்)[!. ]*$/i, 'Hi! Ask about products, ordering, delivery or wholesale.']
 ];

 function addMessage(message, customer = false, linkLabel, href) {
  const bubble = document.createElement('p');
  if (customer) bubble.className = 'mvn-chat-customer';
  bubble.textContent = message;
  if (href) {
   const link = document.createElement('a');
   link.href = href;
   link.textContent = linkLabel;
   bubble.append(' ', link);
  }
  log.append(bubble);
  log.scrollTop = log.scrollHeight;
 }

 function ask(question) {
  addMessage(question, true);
  const answer = topics.find(([match]) => match.test(question));
  if (answer) addMessage(...answer.slice(1));
  else addMessage('Our team can help with that. Use Call us below to speak with Max Volume Nutrition.');
  call.hidden = false;
 }

 launcher.addEventListener('click', () => dialog.showModal());
 dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
 form.addEventListener('submit', event => {
  event.preventDefault();
  const question = input.value.trim();
  if (!question) return;
  input.value = '';
  ask(question);
 });
 for (const button of dialog.querySelectorAll('[data-question]')) {
  button.addEventListener('click', () => ask(button.dataset.question));
 }
})();
