(() => {
  const modal = document.querySelector('[data-booking-modal]');
  if (!modal) return;

  const dialog = modal.querySelector('.booking-dialog');
  const scheduleStep = modal.querySelector('[data-book-step="schedule"]');
  const detailsStep = modal.querySelector('[data-book-step="details"]');
  const successStep = modal.querySelector('[data-book-step="success"]');
  const routeFilters = modal.querySelector('[data-book-routes]');
  const daysElement = modal.querySelector('[data-book-days]');
  const statusElement = modal.querySelector('[data-book-status]');
  const slotsElement = modal.querySelector('[data-book-slots]');
  const form = modal.querySelector('[data-book-form]');
  const selectionElement = modal.querySelector('[data-book-selection]');
  const formError = modal.querySelector('[data-book-form-error]');
  const totalElement = modal.querySelector('[data-book-total]');
  const guestsCount = modal.querySelector('[data-guests-count]');
  const guestsHint = modal.querySelector('[data-guests-hint]');
  const submitButton = modal.querySelector('[data-book-submit]');

  const routeMeta = {
    'Малый тур': { title: 'Знакомство', duration: '1 час', fallbackPrice: 1900 },
    'Средний тур': { title: 'Приключение', duration: '1,5 часа', fallbackPrice: 2200 },
    'Большой тур': { title: 'Экспедиция', duration: '2,5 часа', fallbackPrice: 3700 },
  };
  const money = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
  const dayFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
  const weekdayFormat = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' });
  const longDateFormat = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  const state = {
    items: [],
    service: 'all',
    day: '',
    selected: null,
    guests: 1,
    requestId: '',
    loaded: false,
    loading: false,
    restoreFocus: null,
  };

  const localDate = value => new Date(String(value).replace(' ', 'T'));
  const dateKey = item => item.starts_at.slice(0, 10);
  const metaFor = item => routeMeta[item.service_name] || {
    title: item.service_name,
    duration: `${Math.round(item.duration_minutes / 30) / 2} часа`,
    fallbackPrice: 0,
  };
  const priceFor = item => Number(item.price_per_guest) || metaFor(item).fallbackPrice;
  const timeFor = value => String(value).slice(11, 16);
  const createRequestId = () => window.crypto?.randomUUID?.() || `fort-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const isLocalPreview = location.protocol === 'file:' || ['127.0.0.1', 'localhost'].includes(location.hostname);

  const setProgress = step => {
    const order = ['schedule', 'details', 'success'];
    const activeIndex = order.indexOf(step);
    modal.querySelectorAll('[data-book-progress]').forEach((item, index) => {
      item.classList.toggle('is-active', index === activeIndex);
      item.classList.toggle('is-done', index < activeIndex);
    });
  };

  const showStep = step => {
    scheduleStep.hidden = step !== 'schedule';
    detailsStep.hidden = step !== 'details';
    successStep.hidden = step !== 'success';
    setProgress(step);
    modal.querySelector('.booking-stage')?.scrollTo({ top: 0, behavior: 'instant' });
  };

  const setStatus = (title, copy = '', retry = false) => {
    statusElement.hidden = false;
    statusElement.innerHTML = '';
    const wrapper = document.createElement('div');
    const heading = document.createElement('b');
    heading.textContent = title;
    const paragraph = document.createElement('p');
    paragraph.textContent = copy;
    wrapper.append(heading, paragraph);
    if (retry) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'booking-back';
      button.textContent = 'Попробовать ещё раз';
      button.addEventListener('click', loadAvailability);
      wrapper.append(button);
    }
    statusElement.append(wrapper);
  };

  const setLoadingStatus = () => {
    statusElement.hidden = false;
    statusElement.innerHTML = '<span class="booking-loader"></span><p>Сверяемся с расписанием…</p>';
  };

  const mockItems = () => {
    const at = (offset, hour, minutes = 0) => {
      const date = new Date();
      date.setDate(date.getDate() + offset);
      date.setHours(hour, minutes, 0, 0);
      const iso = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      return iso.replace('T', ' ');
    };
    return [
      { id: 101, service_name: 'Малый тур', starts_at: at(1, 11), ends_at: at(1, 12), duration_minutes: 60, price_per_guest: 1900, available_seats: 7, capacity: 10 },
      { id: 102, service_name: 'Средний тур', starts_at: at(1, 14, 30), ends_at: at(1, 16), duration_minutes: 90, price_per_guest: 2200, available_seats: 4, capacity: 10 },
      { id: 103, service_name: 'Большой тур', starts_at: at(2, 12), ends_at: at(2, 14, 30), duration_minutes: 150, price_per_guest: 3700, available_seats: 6, capacity: 10 },
      { id: 104, service_name: 'Средний тур', starts_at: at(3, 16), ends_at: at(3, 17, 30), duration_minutes: 90, price_per_guest: 2200, available_seats: 2, capacity: 10 },
      { id: 105, service_name: 'Малый тур', starts_at: at(5, 13), ends_at: at(5, 14), duration_minutes: 60, price_per_guest: 1900, available_seats: 9, capacity: 10 },
    ];
  };

  const filteredItems = () => state.items.filter(item => state.service === 'all' || item.service_name === state.service);

  const renderRouteFilters = () => {
    routeFilters.innerHTML = '';
    const availableServices = new Set(state.items.map(item => item.service_name));
    const choices = [
      ['all', 'Все маршруты'],
      ...Object.entries(routeMeta).filter(([service]) => availableServices.has(service)).map(([service, meta]) => [service, meta.title]),
    ];
    if (state.service !== 'all' && !availableServices.has(state.service)) choices.push([state.service, routeMeta[state.service]?.title || state.service]);
    choices.forEach(([service, title]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `booking-route-chip${state.service === service ? ' is-active' : ''}`;
      button.textContent = title;
      button.addEventListener('click', () => {
        state.service = service;
        state.day = '';
        renderAvailability();
      });
      routeFilters.append(button);
    });
  };

  const renderDays = items => {
    daysElement.innerHTML = '';
    const days = [...new Set(items.map(dateKey))];
    if (!days.includes(state.day)) state.day = days[0] || '';
    days.forEach(day => {
      const date = new Date(`${day}T12:00:00`);
      const count = items.filter(item => dateKey(item) === day).length;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `booking-day${state.day === day ? ' is-active' : ''}`;
      button.innerHTML = `<span>${weekdayFormat.format(date)}</span><b>${dayFormat.format(date).replace('.', '')}</b><small>${count} ${count === 1 ? 'рейс' : count < 5 ? 'рейса' : 'рейсов'}</small>`;
      button.addEventListener('click', () => {
        state.day = day;
        renderAvailability();
      });
      daysElement.append(button);
    });
  };

  const selectSlot = item => {
    state.selected = item;
    state.guests = 1;
    state.requestId = createRequestId();
    form.reset();
    formError.textContent = '';
    form.querySelectorAll('.is-invalid').forEach(field => field.classList.remove('is-invalid'));
    updateSelection();
    showStep('details');
    form.querySelector('input[name="name"]')?.focus();
  };

  const renderSlots = items => {
    slotsElement.innerHTML = '';
    const dayItems = items.filter(item => dateKey(item) === state.day);
    statusElement.hidden = Boolean(dayItems.length);
    if (!dayItems.length) {
      setStatus('Свободных рейсов пока нет', 'Выберите другой маршрут или позвоните — подберём ближайший выход.');
      return;
    }
    dayItems.forEach(item => {
      const meta = metaFor(item);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'booking-slot';
      button.innerHTML = `
        <span class="booking-slot__time">${timeFor(item.starts_at)}</span>
        <span class="booking-slot__copy"><b>${meta.title}</b><span>${meta.duration}</span><small>${item.available_seats <= 3 ? `Осталось ${item.available_seats} места` : `Свободно ${item.available_seats} мест`}</small></span>
        <span class="booking-slot__price"><b>${money.format(priceFor(item))} ₽</b><small>за гостя</small></span>`;
      button.addEventListener('click', () => selectSlot(item));
      slotsElement.append(button);
    });
  };

  const renderAvailability = () => {
    renderRouteFilters();
    const items = filteredItems();
    renderDays(items);
    renderSlots(items);
  };

  async function loadAvailability() {
    if (state.loading) return;
    state.loading = true;
    state.loaded = false;
    daysElement.innerHTML = '';
    slotsElement.innerHTML = '';
    setLoadingStatus();
    try {
      let items;
      if (isLocalPreview) {
        await new Promise(resolve => setTimeout(resolve, 260));
        items = mockItems();
      } else {
        const today = new Date();
        const from = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        const response = await fetch(`booking-api.php?action=availability&from=${encodeURIComponent(from)}&days=21`, {
          headers: { Accept: 'application/json' },
          credentials: 'same-origin',
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body.ok) throw new Error(body.message || 'Расписание временно недоступно.');
        items = Array.isArray(body.items) ? body.items : [];
      }
      state.items = items;
      state.loaded = true;
      renderAvailability();
      if (!items.length) setStatus('Новых рейсов пока нет', 'Позвоните нам — возможно, расписание на нужную дату ещё формируется.');
    } catch (error) {
      setStatus('Не удалось загрузить расписание', error.message || 'Проверьте соединение и попробуйте ещё раз.', true);
    } finally {
      state.loading = false;
    }
  }

  const updateSelection = () => {
    const item = state.selected;
    if (!item) return;
    const meta = metaFor(item);
    const date = localDate(item.starts_at);
    selectionElement.innerHTML = `<div><b>${meta.title}</b><span>${longDateFormat.format(date)}, ${timeFor(item.starts_at)} · ${meta.duration}</span></div><div><small>за гостя</small><strong>${money.format(priceFor(item))} ₽</strong></div>`;
    guestsCount.textContent = state.guests;
    guestsHint.textContent = `На рейсе доступно мест: ${item.available_seats}`;
    totalElement.textContent = `Итого: ${money.format(priceFor(item) * state.guests)} ₽`;
    modal.querySelector('[data-guests-minus]').disabled = state.guests <= 1;
    modal.querySelector('[data-guests-plus]').disabled = state.guests >= Math.min(12, item.available_seats);
  };

  const showSuccess = body => {
    const item = state.selected;
    const meta = metaFor(item);
    const date = localDate(item.starts_at);
    modal.querySelector('[data-book-success-copy]').textContent = 'Места зарезервированы. Мы свяжемся с вами, если потребуется уточнить детали поездки.';
    modal.querySelector('[data-book-success-summary]').innerHTML = `
      <div><small>Маршрут</small><b>${meta.title}</b></div>
      <div><small>Отправление</small><b>${dayFormat.format(date).replace('.', '')}, ${timeFor(item.starts_at)}</b></div>
      <div><small>Гостей</small><b>${state.guests}</b></div>`;
    showStep('success');
    successStep.querySelector('button')?.focus();
  };

  const submitBooking = async event => {
    event.preventDefault();
    const nameInput = form.elements.name;
    const phoneInput = form.elements.phone;
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const phoneDigits = phone.replace(/\D/g, '');
    nameInput.classList.toggle('is-invalid', !name);
    phoneInput.classList.toggle('is-invalid', ![10, 11].includes(phoneDigits.length));
    if (!name || ![10, 11].includes(phoneDigits.length)) {
      formError.textContent = 'Укажите имя и российский номер телефона.';
      (!name ? nameInput : phoneInput).focus();
      return;
    }
    if (form.elements.company.value) return showSuccess({ ok: true });
    formError.textContent = '';
    submitButton.disabled = true;
    const originalText = submitButton.innerHTML;
    submitButton.textContent = 'Сохраняем…';
    try {
      let body = { ok: true };
      if (!isLocalPreview) {
        const response = await fetch('booking-api.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            request_id: state.requestId,
            schedule_item_id: state.selected.id,
            name,
            phone,
            guests_count: state.guests,
            consent: true,
            source_url: location.href,
          }),
        });
        body = await response.json().catch(() => ({}));
        if (!response.ok || !body.ok) throw new Error(body.message || 'Не удалось создать запись.');
      } else {
        await new Promise(resolve => setTimeout(resolve, 420));
      }
      showSuccess(body);
    } catch (error) {
      formError.textContent = error.message || 'Не удалось создать запись. Позвоните нам или попробуйте ещё раз.';
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = originalText;
    }
  };

  const openModal = trigger => {
    state.restoreFocus = trigger;
    state.service = trigger.dataset.bookService || 'all';
    state.day = '';
    showStep('schedule');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('booking-open');
    document.querySelector('#mobile-menu')?.classList.remove('is-open');
    document.querySelector('.menu-toggle')?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    if (state.loaded) renderAvailability(); else loadAvailability();
    requestAnimationFrame(() => dialog.focus());
  };

  const closeModal = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('booking-open');
    state.restoreFocus?.focus?.();
  };

  document.querySelectorAll('[data-book-open]').forEach(button => button.addEventListener('click', () => openModal(button)));
  modal.querySelectorAll('[data-book-close]').forEach(button => button.addEventListener('click', closeModal));
  modal.querySelector('[data-book-back]')?.addEventListener('click', () => showStep('schedule'));
  modal.querySelector('[data-guests-minus]')?.addEventListener('click', () => { state.guests = Math.max(1, state.guests - 1); updateSelection(); });
  modal.querySelector('[data-guests-plus]')?.addEventListener('click', () => { state.guests = Math.min(12, state.selected?.available_seats || 1, state.guests + 1); updateSelection(); });
  form.addEventListener('submit', submitBooking);
  form.elements.phone.addEventListener('input', event => {
    event.target.classList.remove('is-invalid');
    let digits = event.target.value.replace(/\D/g, '').slice(0, 11);
    if (digits.startsWith('8')) digits = `7${digits.slice(1)}`;
    if (digits.length === 10) digits = `7${digits}`;
    if (!digits) return;
    const parts = [`+${digits.slice(0, 1)}`];
    if (digits.length > 1) parts.push(` (${digits.slice(1, 4)}` + (digits.length >= 4 ? ')' : ''));
    if (digits.length > 4) parts.push(` ${digits.slice(4, 7)}`);
    if (digits.length > 7) parts.push(`-${digits.slice(7, 9)}`);
    if (digits.length > 9) parts.push(`-${digits.slice(9, 11)}`);
    event.target.value = parts.join('');
  });
  form.elements.name.addEventListener('input', event => event.target.classList.remove('is-invalid'));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
  });
})();
