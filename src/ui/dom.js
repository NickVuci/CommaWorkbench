export const qs = (sel, root=document) => root.querySelector(sel);
export const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));
export function el(tag, props={}, children=[]) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  for(const c of children){ node.appendChild(typeof c==='string'? document.createTextNode(c): c); }
  return node;
}
export function clear(node){ while(node.firstChild) node.removeChild(node.firstChild); }
export function setText(node, text){ node.textContent = String(text); }
