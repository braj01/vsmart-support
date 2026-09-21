const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

function sanitizeHtml(dirty) {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: ['b','i','u','s','strong','em','ul','ol','li','p','br','a','img','h1','h2','h3','blockquote','code','pre'], ALLOWED_ATTR: ['href','src','alt','target'] });
}

module.exports = { sanitizeHtml };
