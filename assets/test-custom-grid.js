document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('custom-product-modal');
  const modalContainer = document.getElementById('modal-dynamic-content');
  const closeBtn = document.querySelector('.modal-close-btn');

  if (!modal || !modalContainer) return;

  document.querySelectorAll('.hotspot-trigger-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const card = e.target.closest('.grid-card-item');
      if (!card) return;

      const handle = card.dataset.productHandle;
      if (!handle) return;

      try {
        const response = await fetch(`/products/${handle}.js`);
        if (!response.ok) throw new Error('Product fetch failed');

        const productData = await response.json();
        renderModalContent(productData);
        openModal();
      } catch (err) {
        console.error('Error fetching product data:', err);
      }
    });
  });

  function openModal() {
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  window.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  function getColorHex(colorName) {
    const c = colorName.toLowerCase();
    if (c.includes('red')) return '#b80d32';
    if (c.includes('grey') || c.includes('gray')) return '#9aa0a6';
    if (c.includes('blue')) return '#1a56db';
    if (c.includes('black')) return '#111111';
    if (c.includes('white')) return '#e5e5e5';
    return '#888888';
  }

  function renderModalContent(product) {
    const formattedPrice = (product.price / 100).toFixed(2).replace('.', ',') + '€';

    const colorOption = product.options.find(o => o.name.toLowerCase() === 'color' || o.name.toLowerCase() === 'colour');
    const sizeOption = product.options.find(o => o.name.toLowerCase() === 'size');

    let colorHTML = '';
    if (colorOption) {
      colorHTML = `
        <div class="modal-option-group">
          <label class="modal-option-label">Color</label>
          <div class="color-swatch-container">
            ${colorOption.values.map((val, idx) => `
              <button type="button" class="color-btn ${idx === 0 ? 'active' : ''}" data-value="${escapeHtml(val)}">
                <span class="color-accent-bar" style="background-color: ${getColorHex(val)};"></span>
                <span>${escapeHtml(val)}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    let sizeHTML = '';
    if (sizeOption) {
      sizeHTML = `
        <div class="modal-option-group">
          <label class="modal-option-label">Size</label>
          <div class="custom-size-selector" id="custom-size-selector">
            <button type="button" class="size-trigger-btn" id="size-trigger-btn">
              <span class="size-trigger-label" id="selected-size-text">Choose your size</span>
              <span class="size-trigger-icon-box">
                <span class="arrow-icon">&#9660;</span>
              </span>
            </button>
            <div class="size-options-dropdown">
              ${sizeOption.values.map(val => `
                <div class="size-option-item" data-value="${escapeHtml(val)}">${escapeHtml(val)}</div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }

    modalContainer.innerHTML = `
      <div class="modal-product-header">
        <div class="modal-img-wrapper">
          <img src="${product.featured_image}" alt="${escapeHtml(product.title)}">
        </div>
        <div class="modal-header-info">
          <h3 class="modal-product-title">${escapeHtml(product.title)}</h3>
          <div class="modal-product-price">${formattedPrice}</div>
          <p class="modal-product-description">${product.description ? stripHtml(product.description) : ''}</p>
        </div>
      </div>

      <form id="modal-add-to-cart-form">
        ${colorHTML}
        ${sizeHTML}
<button type="submit" id="modal-submit-btn" class="add-to-cart-submit-btn">
  <span>ADD TO CART</span>
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</button>
    `;

    const colorBtns = modalContainer.querySelectorAll('.color-btn');
    colorBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        colorBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    const sizeSelector = document.getElementById('custom-size-selector');
    if (sizeSelector) {
      const triggerBtn = document.getElementById('size-trigger-btn');
      const sizeText = document.getElementById('selected-size-text');
      const optionItems = sizeSelector.querySelectorAll('.size-option-item');

      triggerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sizeSelector.classList.toggle('open');
      });

      optionItems.forEach(item => {
        item.addEventListener('click', () => {
          const val = item.dataset.value;
          sizeText.innerText = val;
          sizeSelector.dataset.selectedValue = val;
          optionItems.forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
          sizeSelector.classList.remove('open');
        });
      });
    }

    const form = document.getElementById('modal-add-to-cart-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleAddToCart(product);
    });
  }

  async function handleAddToCart(product) {
    const submitBtn = document.getElementById('modal-submit-btn');
    if (submitBtn) submitBtn.disabled = true;

    const activeColorBtn = modalContainer.querySelector('.color-btn.active');
    const selectedColor = activeColorBtn ? activeColorBtn.dataset.value : null;

    const sizeSelector = document.getElementById('custom-size-selector');
    const selectedSize = sizeSelector ? sizeSelector.dataset.selectedValue : null;

    let selectedVariant = product.variants.find(v => {
      let matchesColor = selectedColor ? v.options.includes(selectedColor) : true;
      let matchesSize = selectedSize ? v.options.includes(selectedSize) : true;
      return matchesColor && matchesSize;
    });

    if (!selectedVariant) {
      selectedVariant = product.variants[0];
    }

    const itemsToAdd = [{ id: selectedVariant.id, quantity: 1 }];

    const isBlack = selectedColor && selectedColor.toLowerCase() === 'black';
    const isMedium = selectedSize && (selectedSize.toLowerCase() === 'medium' || selectedSize.toLowerCase() === 'm');

    if (isBlack && isMedium) {
      try {
        const bonusRes = await fetch('/products/soft-winter-jacket.js');
        if (bonusRes.ok) {
          const bonusProduct = await bonusRes.json();
          if (bonusProduct.variants && bonusProduct.variants.length > 0) {
            itemsToAdd.push({ id: bonusProduct.variants[0].id, quantity: 1 });
          }
        }
      } catch (err) {
        console.error('Bonus product fetch error:', err);
      }
    }

    try {
      const cartResponse = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ items: itemsToAdd })
      });

      if (cartResponse.ok) {
        closeModal();
        window.location.href = '/cart';
      }
    } catch (err) {
      console.error('Cart API error:', err);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function stripHtml(html) {
    let tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }
});