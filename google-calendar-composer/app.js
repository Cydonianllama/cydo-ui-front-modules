// 
// 
// component -> dialog
// 
// 
// 

const GM_LOG_IDENTIFICATOR = `[GMDIALOG]`
const GM_DEFAULT_HEIGHT = 350

function ExecLog(type, message) {
  if (type == 'warn') {
    console.warn(`${GM_LOG_IDENTIFICATOR} message`)
  }
}

class GMDialog {

  static #counter = 0;

  constructor() {
    GMDialog.#counter += 1;
    this.id = `gm-dialog-${GMDialog.#counter}`;
  }

  // unique id (exposed in events detail)
  id = '';

  // dialog open or closed
  open = false

  // status = 1 => dialog
  // status = 2 => coupled
  // status = 3 => absolute
  status = 1;

  // important to animation coupled
  containerToCoupled = null;

  // important to animation and replacement
  continaerAbsolute = null;

  // dialog properties
  height = 350;
  x = 0;
  y = 0;
  moving = false;

  // references about dialog
  reference = null;

  // Emit position-aware CustomEvent on document.
  // detail: { id, x, y, width, height, rect, moving, status, ref }
  #emit(name, extra = {}) {
    if (!this.reference) return;
    const rect = this.reference.getBoundingClientRect();
    document.dispatchEvent(new CustomEvent(`gm-dialog:${name}`, {
      bubbles: true,
      detail: {
        id: this.id,
        x: this.x,
        y: this.y,
        width: rect.width,
        height: rect.height,
        rect: { x: rect.x, y: rect.y, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
        moving: this.moving,
        status: this.status,
        ref: this.reference,
        ...extra
      }
    }));
  }

  #setMoving(moving) {
    this.moving = moving;

    if (moving) {
      document.body.style.cursor = 'move'
    } else {
      document.body.style.cursor = 'inherit'
    }
  }

  #setReference(ref) {
    this.reference = ref;
  }

  validateDialogExistence() {
    if (this.reference) return true;
    return false;
  }

  changeState(newStatus) {
    const prev = this.status;
    this.status = newStatus;
    if (prev === 2 && newStatus !== 2) {
      this.#emit('undock', { prevStatus: prev });
    }
    if (newStatus === 2 && prev !== 2) {
      this.#emit('couple', { prevStatus: prev });
    }
  }

  #setposition(x, y) {
    this.x = x;
    this.y = y;
  }

  // Anchos fijos: 310px normal, 360px (+50px) acoplado.
  static COUPLED_WIDTH = 360;
  static BASE_WIDTH = 310;

  // Snap visual al rect del aside (sin mover el nodo de DOM).
  // El dialog crece a 360px junto con el aside del calendario y ocupa el height total.
  coupleTo(asideRect, padding = 8) {
    if (!this.reference || !asideRect) return;
    if (this.status !== 2) {
      this._prevWidth = this.reference.style.width || '';
      this._prevHeight = this.reference.style.height || '';
      this._prevTop = this.reference.style.top || '';
    }
    const left = asideRect.left + padding;
    const top = asideRect.top + padding;
    const coupledHeight = Math.max(0, asideRect.height - padding * 2);
    // Activar primero el estado acoplado (con su transición left/top) y
    // reiniciar la animación de expansión; luego aplicar la geometría para
    // que el snap se anime en lugar de saltar.
    this.reference.classList.remove('is-over-aside');
    this.reference.classList.remove('is-coupled');
    void this.reference.offsetWidth;
    // is-coupled queda como flag de estado + layout full-height (ver CSS)
    this.reference.classList.add('is-coupled');
    void this.reference.offsetWidth;
    this.#setposition(left, top);
    this.height = coupledHeight;
    this.reference.style.left = `${left}px`;
    this.reference.style.top = `${top}px`;
    this.reference.style.width = `${GMDialog.COUPLED_WIDTH}px`;
    this.reference.style.height = `${coupledHeight}px`;
    this.changeState(2);
  }

  undock() {
    if (!this.reference) return;
    this.reference.classList.remove('is-coupled', 'is-over-aside');
    // volver al width normal (310px fijo) y liberar el height total
    this.reference.style.width = `${GMDialog.BASE_WIDTH}px`;
    this.reference.style.height = '';
    this.reference.style.setProperty('--height-dialog-content', `${GM_DEFAULT_HEIGHT}px`);
    this.height = GM_DEFAULT_HEIGHT;
    this._prevWidth = '';
    this._prevHeight = '';
    this._prevTop = '';
    this.changeState(1);
  }

  #startEvents(dialog) {
    if (!dialog) {
      return;
    }

    const TOP_LIMIT = 50;

    let currentPosx = 0;
    let currentPosy = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    dialog.querySelector('[data-action="move"]').addEventListener('mousedown', (e) => {
      // Si estaba acoplado, desacoplar al empezar a mover (GMPanels restaura width).
      if (this.status === 2) {
        this.undock();
      }
      this.#setMoving(true);
      e.preventDefault();

      currentPosx = dialog.getBoundingClientRect().x;
      currentPosy = dialog.getBoundingClientRect().y;

      currentMouseX = e.clientX;
      currentMouseY = e.clientY;

      this.#emit('dragstart', { mouseX: e.clientX, mouseY: e.clientY });
    });

    dialog.querySelector('[data-action="couple"]').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.status === 2) {
        this.undock();
      } else {
        // Si el dialog ya está sobre el aside, GMPanels lo acoplará;
        // si no, se emite intent para que GMPanels decida (snap si está dentro).
        this.#emit('couple-request');
      }
    });

    document.body.addEventListener('mousemove', (e) => {
      if (!this.moving) return;

      // body information
      const bodyInfo = document.body.getBoundingClientRect();

      // position calculation
      const deltaX = e.clientX - currentMouseX;
      const deltaY = e.clientY - currentMouseY;

      const newX = currentPosx + deltaX;
      const newY = currentPosy + deltaY;

      this.#setposition(newX, this.y);
      dialog.style.left = `${newX}px`;

      let updateY = true;

      // if is in range
      if ((newY + dialog.getBoundingClientRect().height) < (bodyInfo.height - TOP_LIMIT)) {
        dialog.style.setProperty('--height-dialog-content', `${GM_DEFAULT_HEIGHT}px`);
      }

      // validate limits horizontal
      if (deltaY > 0) { // hacia abajo

      } else { // hacia arriba

      }

      if ((dialog.getBoundingClientRect().height + newY) > (bodyInfo.height - TOP_LIMIT)) {
        console.log('limit')
        let gap = (dialog.getBoundingClientRect().height + newY) - (bodyInfo.height - TOP_LIMIT)
        if (dialog.querySelector('.dialog-content').getBoundingClientRect().height > 70) {
          dialog.style.setProperty('--height-dialog-content', `${dialog.querySelector('.dialog-content').getBoundingClientRect().height - gap}px`);
        } else {
          updateY = false;
        }
      }

      if (newY < (bodyInfo.x + TOP_LIMIT)) {
        updateY = false;
      }

      if (updateY) {
        this.#setposition(this.x, newY);
        dialog.style.top = `${newY}px`;
      }

      // Exponer posicionamiento x/y en cada movimiento
      this.#emit('move', { mouseX: e.clientX, mouseY: e.clientY });
    });

    document.body.addEventListener('mouseup', (e) => {
      if (!this.moving) return;
      this.#setMoving(false);
      this.#emit('dragend', { mouseX: e.clientX, mouseY: e.clientY });
    });

    // soltar cuando séa por derecha
    // document.body.addEventListener('mouseleave', () => {
    //   this.#setMoving(false);
    // });

    window.addEventListener('resize', () => {

    });
  }

  startAndOpen() {
    const dialog = document.createElement('div')
    dialog.classList.add('gm-dialog')

    // default positioning
    const { x, y, height, width } = document.body.getBoundingClientRect()

    let xPos = height / 2
    let yPos = width / 2

    dialog.style.top = `${xPos}px`
    dialog.style.left = `${yPos}px`

    this.#setposition(xPos, yPos)

    dialog.innerHTML = `
    <div class="dialog-header">
      <div class ="dialog-header--leftsection">
        <button class = "btn" data-action="couple">
          <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M32 96v64h448V96H32zm0 128v64h448v-64H32zm0 128v64h448v-64H32z"></path></svg>
        </button>
      </div>
      <div class ="dialog-header--blank" data-action="move">
      
      </div>
    </div>
    <div class="dialog-content"  data-ref="content" >
      Contenido
    </div>
    <div class="dialog-footer">
    
    </div>`
    this.#setReference(dialog)
    this.#startEvents(dialog);
    document.body.append(dialog)
    return dialog;
  }

  // insertIn -> 'content' | 'footer'
  // contentDOM -> HTMLDOM
  // afterAppend: (dialogRef) => {} 
  insertContentToDialog(insertIn, contentDOM, afterAppend) {
    if (!this.validateDialogExistence()) {
      ExecLog('warn', `Dialog not instanced, apply build method before.`)
      return
    };

  }

}

// 
// 
// 
//  PANELS
// 
// 
// 

class GMPannels {
  constructor() {
    this.aside = null;
    this.container = null;
    this.calendarAside = null;
    this.isOver = false;
    this.coupledDialogId = null;
    this.baseAsideWidth = 0;
    this.observedIds = new Set();
    this.coupledDialogRef = null;
    this._clearEmphasisTimer = null;
    this._boundOnMove = (e) => this.#onMove(e);
    this._boundOnDrop = (e) => this.#onDrop(e);
    this._boundOnDragStart = (e) => this.#onDragStart(e);
    this._boundOnUndock = (e) => this.#onUndockEvent(e);
    this._boundOnCoupleRequest = (e) => this.#onCoupleRequest(e);
  }

  start() {
    this.aside = document.querySelector('.gm-aside-panel');
    this.container = document.querySelector('.gm-pannels-container');
    this.calendarAside = document.querySelector('.container-calendar .aside');
    if (!this.aside) {
      console.error('[GMPANELS] .gm-aside-panel not found');
      return this;
    }
    this.baseAsideWidth = this.aside.getBoundingClientRect().width || 310;

    document.addEventListener('gm-dialog:move', this._boundOnMove);
    document.addEventListener('gm-dialog:dragend', this._boundOnDrop);
    document.addEventListener('gm-dialog:dragstart', this._boundOnDragStart);
    document.addEventListener('gm-dialog:undock', this._boundOnUndock);
    document.addEventListener('gm-dialog:couple-request', this._boundOnCoupleRequest);
    window.addEventListener('resize', () => this.#refitCoupled());
    return this;
  }

  // Registrar un GMDialog concreto (filtra por detail.id si hay varios).
  observe(dialog) {
    if (dialog && dialog.id) this.observedIds.add(dialog.id);
    return this;
  }

  unobserve(dialog) {
    if (dialog && dialog.id) this.observedIds.delete(dialog.id);
    return this;
  }

  #shouldHandle(detail) {
    if (!detail) return false;
    if (this.observedIds.size === 0) return true;
    return this.observedIds.has(detail.id);
  }

  #isInsideAside(dialogRect) {
    if (!this.aside || !dialogRect) return false;
    const asideRect = this.aside.getBoundingClientRect();
    const cx = dialogRect.left + dialogRect.width / 2;
    const cy = dialogRect.top + dialogRect.height / 2;
    return (
      cx >= asideRect.left &&
      cx <= asideRect.right &&
      cy >= asideRect.top &&
      cy <= asideRect.bottom
    );
  }

  #setHover(on, dialogRef) {
    this.isOver = on;
    if (!this.aside) return;
    this.aside.classList.toggle('is-dragover', on);
    if (dialogRef) dialogRef.classList.toggle('is-over-aside', on);
  }

  #onMove(e) {
    const detail = e.detail;
    if (!this.#shouldHandle(detail)) return;
    // Si ya hay un dialog acoplado distinto, ignorar hover de otros
    if (this.coupledDialogId && detail.id !== this.coupledDialogId) return;
    const rect = detail.rect || (detail.ref ? detail.ref.getBoundingClientRect() : null);
    if (!rect) return;
    const inside = this.#isInsideAside(rect);
    if (inside && !this.isOver) this.#setHover(true, detail.ref);
    else if (!inside && this.isOver) this.#setHover(false, detail.ref);
  }

  #onDrop(e) {
    const detail = e.detail;
    if (!this.#shouldHandle(detail)) return;
    const rect = detail.rect || (detail.ref ? detail.ref.getBoundingClientRect() : null);
    const inside = rect ? this.#isInsideAside(rect) : this.isOver;
    if (inside) {
      this.#dock(detail);
    } else {
      this.#setHover(false, detail.ref);
    }
  }

  #onDragStart(e) {
    const detail = e.detail;
    if (!this.#shouldHandle(detail)) return;
    // Desacople al volver a mover un dialog acoplado
    if (this.coupledDialogId && detail.id === this.coupledDialogId) {
      this.#undock(detail.ref);
    }
  }

  #onUndockEvent(e) {
    const detail = e.detail;
    if (!this.#shouldHandle(detail)) return;
    if (this.coupledDialogId && detail.id === this.coupledDialogId) {
      this.#undock(detail.ref);
    }
  }

  #onCoupleRequest(e) {
    const detail = e.detail;
    if (!this.#shouldHandle(detail)) return;
    const ref = detail.ref;
    const rect = ref ? ref.getBoundingClientRect() : detail.rect;
    if (rect && this.#isInsideAside(rect)) {
      this.#dock(detail);
    }
  }

  // Mantener el dialog acoplado ocupando el height total ante un resize.
  #refitCoupled() {
    if (!this.coupledDialogRef || !this.aside) return;
    const padding = 8;
    const asideRect = this.aside.getBoundingClientRect();
    this.coupledDialogRef.style.left = `${asideRect.left + padding}px`;
    this.coupledDialogRef.style.top = `${asideRect.top + padding}px`;
    this.coupledDialogRef.style.width = `${GMDialog.COUPLED_WIDTH}px`;
    this.coupledDialogRef.style.height = `${Math.max(0, asideRect.height - padding * 2)}px`;
  }

  #clearEmphasisVisuals(dialogRef) {
    if (this.aside) this.aside.classList.remove('is-dragover');
    if (dialogRef) dialogRef.classList.remove('is-over-aside');
    // is-coupled en dialog queda como flag de estado pero sin estilo visual;
    // el outline enfatizado solo vive durante dragover.
  }

  #dock(detail) {
    if (!this.aside || !detail || !detail.ref) return;
    // El panel (.gm-aside-panel) es solo zona sensora: no cambia su width.
    const asideRect = this.aside.getBoundingClientRect();
    if (this._clearEmphasisTimer) {
      clearTimeout(this._clearEmphasisTimer);
      this._clearEmphasisTimer = null;
    }
    this.#setHover(false, detail.ref);

    // +50px en dialog + aside del calendario (310 -> 360 fijo)
    if (this.calendarAside) {
      this.calendarAside.style.width = `${GMDialog.COUPLED_WIDTH}px`;
    }

    // Resolver instancia GMDialog si fue observada para usar coupleTo (snap + animación width/height)
    const dialogInstance = (typeof dialog !== 'undefined' && dialog.id === detail.id) ? dialog : null;
    if (dialogInstance && typeof dialogInstance.coupleTo === 'function') {
      dialogInstance.coupleTo(asideRect);
    } else {
      const padding = 8;
      detail.ref.classList.remove('is-over-aside');
      detail.ref.classList.remove('is-coupled');
      void detail.ref.offsetWidth;
      detail.ref.classList.add('is-coupled');
      void detail.ref.offsetWidth;
      detail.ref.style.left = `${asideRect.left + padding}px`;
      detail.ref.style.top = `${asideRect.top + padding}px`;
      detail.ref.style.width = `${GMDialog.COUPLED_WIDTH}px`;
      detail.ref.style.height = `${Math.max(0, asideRect.height - padding * 2)}px`;
    }

    this.coupledDialogId = detail.id;
    this.coupledDialogRef = detail.ref;

    // Al finalizar el acoplamiento, quitar el visual de énfasis
    this._clearEmphasisTimer = setTimeout(() => {
      this.#clearEmphasisVisuals(detail.ref);
      this._clearEmphasisTimer = null;
    }, 300);

    document.dispatchEvent(new CustomEvent('gm-panels:dock', {
      bubbles: true,
      detail: { id: detail.id, x: detail.x, y: detail.y, asideRect: { ...asideRect, width: asideRect.width, height: asideRect.height }, ref: detail.ref }
    }));
  }

  #undock(dialogRef) {
    const ref = dialogRef || this.coupledDialogRef;
    if (this._clearEmphasisTimer) {
      clearTimeout(this._clearEmphasisTimer);
      this._clearEmphasisTimer = null;
    }
    // El panel no cambió de width: solo limpiar clases de hover/estado visual
    if (this.aside) {
      this.aside.classList.remove('is-coupled', 'is-dragover');
    }
    // El aside del calendario vuelve a su width normal
    if (this.calendarAside) {
      this.calendarAside.style.width = '';
    }
    // El dialog vuelve a 310px y libera el height total (si es instancia GMDialog usa su undock, si no directo)
    if (ref) {
      ref.classList.remove('is-coupled', 'is-over-aside');
      if (!ref.classList.contains('is-coupled')) {
        ref.style.width = `${GMDialog.BASE_WIDTH}px`;
        ref.style.height = '';
      }
    }
    this.isOver = false;
    const id = this.coupledDialogId;
    this.coupledDialogId = null;
    this.coupledDialogRef = null;
    document.dispatchEvent(new CustomEvent('gm-panels:undock', {
      bubbles: true,
      detail: { id, ref }
    }));
  }
}




// 
// 
// 
// SHARED INSTANCES
// 
// 
// 

const dialog = new GMDialog();
const panels = new GMPannels();

window.addEventListener('load', () => {
  dialog.startAndOpen()
  panels.start();
  panels.observe(dialog);
  window.gm = { dialog, panels };
})

// 
// 
// 
// page -> calendar
// 
// 
// 

function HandleToOpenCalendar() {

}

function BootstrapCalendarPage() {
  const btnCreateEventRef = document.getElementById('btn-create-event')

  if (btnCreateEventRef) {
    btnCreateEventRef.addEventListener('click', HandleToOpenCalendar)
  } else {
    console.error('btnCreateEventRef not founded')
  }

}

// 
// 
// 
// page -> calendar-create
// 
// 
// 

function BootstrapCreateEventPage() {

}


// 
// 
// 
// page -> calendar-edit
// 
// 
// 

function BootstrapEditCalendar() {

}


// 
// 
// 
// BOOTSRTAP
// 
// 
// 

function App() {
  BootstrapCalendarPage();
  BootstrapCreateEventPage();
  BootstrapEditCalendar();
}


App()
