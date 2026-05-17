const DEFAULT_SERVICES = [
  'Chirurgie Femme',
  'Chirurgie Homme',
  'Medecine Homme',
  'Medecine Femme',
  'Pediatrie',
  'Chirurgie Infantile',
  'Maternite',
  'Urgences',
  'Pneumologie',
  'Psychiatrie',
  'Reanimation'
];

let dossiers = [];
let services = [...DEFAULT_SERVICES];
let currentPage = 1;

const storageApi = window.archiveApi || {
  async listDossiers() {
    return JSON.parse(localStorage.getItem('dossiers') || '[]');
  },
  async saveDossiers(nextDossiers) {
    localStorage.setItem('dossiers', JSON.stringify(nextDossiers));
    return nextDossiers;
  },
  async listServices() {
    return JSON.parse(localStorage.getItem('services') || '[]');
  },
  async saveServices(nextServices) {
    localStorage.setItem('services', JSON.stringify(nextServices));
    return nextServices;
  },
  async createBackup() {
    window.alert('La sauvegarde JSON est disponible seulement avec l application Electron.');
    return '';
  }
};

const elements = {
  addBtn: document.querySelector('#addBtn'),
  addServiceBtn: document.querySelector('#addServiceBtn'),
  backupBtn: document.querySelector('#backupBtn'),
  resetFiltersBtn: document.querySelector('#resetFiltersBtn'),
  modal: document.querySelector('#dossierModal'),
  serviceModal: document.querySelector('#serviceModal'),
  form: document.querySelector('#dossierForm'),
  serviceForm: document.querySelector('#serviceForm'),
  dialogTitle: document.querySelector('#dialogTitle'),
  closeDialogBtn: document.querySelector('#closeDialogBtn'),
  closeServiceDialogBtn: document.querySelector('#closeServiceDialogBtn'),
  cancelBtn: document.querySelector('#cancelBtn'),
  cancelServiceBtn: document.querySelector('#cancelServiceBtn'),
  formError: document.querySelector('#formError'),
  serviceFormError: document.querySelector('#serviceFormError'),
  newServiceName: document.querySelector('#newServiceName'),
  mouvementGroup: document.querySelector('#mouvementGroup'),
  dateMouvementGroup: document.querySelector('#dateMouvementGroup'),
  causeGroup: document.querySelector('#causeGroup'),
  body: document.querySelector('#dossiersBody'),
  emptyState: document.querySelector('#emptyState'),
  counter: document.querySelector('#counter'),
  pageSizeSelect: document.querySelector('#pageSizeSelect'),
  prevPageBtn: document.querySelector('#prevPageBtn'),
  nextPageBtn: document.querySelector('#nextPageBtn'),
  pageInfo: document.querySelector('#pageInfo'),
  filters: {
    search: document.querySelector('#searchInput'),
    service: document.querySelector('#serviceFilter'),
    ip: document.querySelector('#ipFilter'),
    dateEntree: document.querySelector('#dateEntreeFilter'),
    dateSortie: document.querySelector('#dateSortieFilter')
  },
  fields: {
    id: document.querySelector('#dossierId'),
    nom: document.querySelector('#nom'),
    prenom: document.querySelector('#prenom'),
    ip_patient: document.querySelector('#ip_patient'),
    cin: document.querySelector('#cin'),
    numero: document.querySelector('#numero'),
    service: document.querySelector('#service'),
    medecin: document.querySelector('#medecin'),
    date_entree: document.querySelector('#date_entree'),
    date_sortie: document.querySelector('#date_sortie'),
    mouvement: document.querySelector('#mouvement'),
    date_mouvement: document.querySelector('#date_mouvement'),
    cause: document.querySelector('#cause')
  }
};

function fillSelect(select, options, placeholder) {
  select.innerHTML = '';
  if (placeholder) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = placeholder;
    select.appendChild(option);
  }
  options.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function sortServices(nextServices) {
  return [...new Set(nextServices.filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
}

function refreshServiceSelects() {
  fillSelect(elements.fields.service, services, 'Choisir un service');
  fillSelect(elements.filters.service, services, 'Tous les services');
  fillMouvementSelect(elements.fields.mouvement);
}

function fillMouvementSelect(select) {
  select.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Choisir mouvement';
  select.appendChild(placeholder);

  const archiveOption = document.createElement('option');
  archiveOption.value = 'Archive';
  archiveOption.textContent = 'Archive';
  select.appendChild(archiveOption);

  const administrationGroup = document.createElement('optgroup');
  administrationGroup.label = 'Administration';
  ['Directeur', 'SAA'].forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    administrationGroup.appendChild(option);
  });
  select.appendChild(administrationGroup);

  const servicesGroup = document.createElement('optgroup');
  servicesGroup.label = 'Services';
  services.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    servicesGroup.appendChild(option);
  });
  select.appendChild(servicesGroup);

  const autreOption = document.createElement('option');
  autreOption.value = 'Autre';
  autreOption.textContent = 'Autre';
  select.appendChild(autreOption);
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function iconSvg(name) {
  const icons = {
    edit: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    trash: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>'
  };
  return icons[name] || '';
}

function createMetaLine(label, value) {
  const line = document.createElement('span');
  line.className = 'meta-line';
  line.textContent = `${label}: ${value || '-'}`;
  return line;
}

function getNextId() {
  const maxId = dossiers.reduce((max, dossier) => Math.max(max, Number(dossier.id) || 0), 0);
  return maxId + 1;
}

function getFilteredDossiers() {
  const search = normalize(elements.filters.search.value);
  const service = elements.filters.service.value;
  const ip = normalize(elements.filters.ip.value);
  const dateEntree = elements.filters.dateEntree.value;
  const dateSortie = elements.filters.dateSortie.value;

  return dossiers.filter((dossier) => {
    const haystack = [
      dossier.nom,
      dossier.prenom,
      dossier.ip_patient,
      dossier.cin,
      dossier.numero,
      dossier.service,
      dossier.medecin,
      dossier.mouvement,
      dossier.date_mouvement,
      dossier.cause
    ].map(normalize).join(' ');

    return (!search || haystack.includes(search))
      && (!service || dossier.service === service)
      && (!ip || normalize(dossier.ip_patient).includes(ip))
      && (!dateEntree || dossier.date_entree === dateEntree)
      && (!dateSortie || dossier.date_sortie === dateSortie);
  });
}

function renderTable() {
  const filtered = getFilteredDossiers();
  const pageSize = Number(elements.pageSizeSelect.value) || 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);
  elements.body.innerHTML = '';

  pageItems.forEach((dossier) => {
    const row = document.createElement('tr');

    const patientCell = document.createElement('td');
    const patientName = document.createElement('div');
    patientName.className = 'patient-name';
    patientName.textContent = `${dossier.nom || ''} ${dossier.prenom || ''}`.trim() || '-';
    patientCell.append(
      patientName,
      createMetaLine('IP', dossier.ip_patient),
      createMetaLine('CIN', dossier.cin)
    );
    row.appendChild(patientCell);

    const numeroCell = document.createElement('td');
    numeroCell.className = 'strong-cell';
    numeroCell.textContent = dossier.numero || '-';
    row.appendChild(numeroCell);

    const serviceCell = document.createElement('td');
    const serviceBadge = document.createElement('span');
    serviceBadge.className = 'badge badge-service';
    serviceBadge.textContent = dossier.service || '-';
    serviceCell.append(serviceBadge, createMetaLine('Medecin', dossier.medecin));
    row.appendChild(serviceCell);

    const datesCell = document.createElement('td');
    datesCell.append(
      createMetaLine('Entree', dossier.date_entree),
      createMetaLine('Sortie', dossier.date_sortie)
    );
    row.appendChild(datesCell);

    const mouvementCell = document.createElement('td');
    const mouvementBadge = document.createElement('span');
    mouvementBadge.className = 'badge badge-mouvement';
    mouvementBadge.textContent = dossier.mouvement || '-';
    mouvementCell.append(mouvementBadge, createMetaLine('Date', dossier.date_mouvement));
    row.appendChild(mouvementCell);

    const causeCell = document.createElement('td');
    causeCell.className = 'cause muted-cell';
    causeCell.textContent = dossier.cause || '-';
    row.appendChild(causeCell);

    const actionCell = document.createElement('td');
    const actions = document.createElement('div');
    const editButton = document.createElement('button');
    const deleteButton = document.createElement('button');

    actions.className = 'actions';
    editButton.className = 'btn btn-light action-icon';
    editButton.type = 'button';
    editButton.dataset.action = 'edit';
    editButton.dataset.id = dossier.id;
    editButton.title = 'Modifier';
    editButton.setAttribute('aria-label', 'Modifier');
    editButton.innerHTML = iconSvg('edit');

    deleteButton.className = 'btn btn-danger action-icon';
    deleteButton.type = 'button';
    deleteButton.dataset.action = 'delete';
    deleteButton.dataset.id = dossier.id;
    deleteButton.title = 'Supprimer';
    deleteButton.setAttribute('aria-label', 'Supprimer');
    deleteButton.innerHTML = iconSvg('trash');

    actions.append(editButton, deleteButton);
    actionCell.appendChild(actions);
    row.appendChild(actionCell);
    elements.body.appendChild(row);
  });

  elements.emptyState.classList.toggle('visible', filtered.length === 0);
  elements.counter.textContent = `${filtered.length} dossier${filtered.length > 1 ? 's' : ''}`;
  elements.pageInfo.textContent = `Page ${currentPage} / ${totalPages}`;
  elements.prevPageBtn.disabled = currentPage <= 1;
  elements.nextPageBtn.disabled = currentPage >= totalPages;
}

function openDialog(dossier = null) {
  const isEdit = Boolean(dossier);
  elements.form.reset();
  elements.formError.textContent = '';
  elements.fields.id.value = dossier ? dossier.id : '';
  elements.dialogTitle.textContent = dossier ? 'Modifier dossier' : 'Ajouter dossier';
  elements.mouvementGroup.classList.toggle('hidden', !isEdit);
  elements.dateMouvementGroup.classList.toggle('hidden', !isEdit);
  elements.causeGroup.classList.toggle('hidden', !isEdit);
  elements.fields.mouvement.required = isEdit;
  elements.fields.date_mouvement.required = isEdit;
  elements.fields.cause.required = isEdit;

  if (dossier) {
    Object.entries(elements.fields).forEach(([key, field]) => {
      if (key !== 'id') field.value = dossier[key] || '';
    });
    if (!elements.fields.date_mouvement.value) {
      elements.fields.date_mouvement.value = new Date().toISOString().slice(0, 10);
    }
  } else {
    elements.fields.mouvement.value = 'Archive';
    elements.fields.date_mouvement.value = '';
    elements.fields.cause.value = 'Nouveau dossier archive';
  }

  elements.modal.classList.remove('hidden');
  elements.modal.setAttribute('aria-hidden', 'false');
  elements.fields.nom.focus();
}

function closeDialog() {
  elements.modal.classList.add('hidden');
  elements.modal.setAttribute('aria-hidden', 'true');
}

function openServiceDialog() {
  elements.serviceForm.reset();
  elements.serviceFormError.textContent = '';
  elements.serviceModal.classList.remove('hidden');
  elements.serviceModal.setAttribute('aria-hidden', 'false');
  elements.newServiceName.focus();
}

function closeServiceDialog() {
  elements.serviceModal.classList.add('hidden');
  elements.serviceModal.setAttribute('aria-hidden', 'true');
}

async function saveService(event) {
  event.preventDefault();
  const name = elements.newServiceName.value.trim().replace(/\s+/g, ' ');

  if (!name) {
    elements.serviceFormError.textContent = 'Le nom du service est obligatoire.';
    return;
  }

  const exists = services.some((service) => normalize(service) === normalize(name));
  if (exists) {
    elements.serviceFormError.textContent = 'Ce service existe deja.';
    return;
  }

  services = sortServices([...services, name]);
  services = sortServices(await storageApi.saveServices(services));
  refreshServiceSelects();
  elements.fields.service.value = name;
  closeServiceDialog();
}

function getFormData() {
  return {
    id: elements.fields.id.value ? Number(elements.fields.id.value) : getNextId(),
    nom: elements.fields.nom.value.trim(),
    prenom: elements.fields.prenom.value.trim(),
    ip_patient: elements.fields.ip_patient.value.trim(),
    cin: elements.fields.cin.value.trim(),
    numero: elements.fields.numero.value.trim(),
    service: elements.fields.service.value,
    medecin: elements.fields.medecin.value.trim(),
    date_entree: elements.fields.date_entree.value,
    date_sortie: elements.fields.date_sortie.value,
    mouvement: elements.fields.mouvement.value,
    date_mouvement: elements.fields.date_mouvement.value,
    cause: elements.fields.cause.value.trim()
  };
}

function validateDossier(dossier) {
  if (!dossier.nom) return 'Le nom est obligatoire.';
  if (!dossier.prenom) return 'Le prenom est obligatoire.';
  if (!dossier.ip_patient) return 'L IP patient est obligatoire.';
  if (!dossier.numero) return 'Le numero du dossier est obligatoire.';
  if (!dossier.service) return 'Le service est obligatoire.';
  if (!dossier.date_entree) return 'La date d entree est obligatoire.';
  if (dossier.date_sortie && dossier.date_sortie < dossier.date_entree) {
    return 'La date de sortie ne doit pas etre inferieure a la date d entree.';
  }
  if (elements.fields.id.value && !dossier.mouvement) return 'Le mouvement est obligatoire.';
  if (elements.fields.id.value && !dossier.date_mouvement) return 'La date du mouvement est obligatoire.';
  if (elements.fields.id.value && dossier.date_mouvement < dossier.date_entree) {
    return 'La date du mouvement ne doit pas etre inferieure a la date d entree.';
  }
  if (elements.fields.id.value && !dossier.cause) return 'La cause du mouvement est obligatoire.';

  const sameIp = dossiers.find((item) =>
    item.id !== dossier.id && normalize(item.ip_patient) === normalize(dossier.ip_patient)
  );
  if (sameIp) return 'L IP patient doit etre unique.';

  const sameNumero = dossiers.find((item) =>
    item.id !== dossier.id && normalize(item.numero) === normalize(dossier.numero)
  );
  if (sameNumero) return 'Le numero du dossier doit etre unique.';

  return '';
}

async function saveDossier(event) {
  event.preventDefault();
  const dossier = getFormData();
  const error = validateDossier(dossier);

  if (error) {
    elements.formError.textContent = error;
    return;
  }

  const index = dossiers.findIndex((item) => item.id === dossier.id);
  if (index >= 0) {
    dossiers[index] = dossier;
  } else {
    dossiers.push(dossier);
  }

  dossiers = await storageApi.saveDossiers(dossiers);
  closeDialog();
  renderTable();
}

async function deleteDossier(id) {
  const dossier = dossiers.find((item) => item.id === id);
  if (!dossier) return;

  const confirmed = window.confirm(`Supprimer le dossier ${dossier.numero} ?`);
  if (!confirmed) return;

  dossiers = dossiers.filter((item) => item.id !== id);
  dossiers = await storageApi.saveDossiers(dossiers);
  renderTable();
}

function handleTableClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const id = Number(button.dataset.id);
  if (button.dataset.action === 'edit') {
    const dossier = dossiers.find((item) => item.id === id);
    if (dossier) openDialog(dossier);
  }

  if (button.dataset.action === 'delete') {
    deleteDossier(id);
  }
}

function resetFilters() {
  Object.values(elements.filters).forEach((input) => {
    input.value = '';
  });
  currentPage = 1;
  renderTable();
}

async function init() {
  elements.addBtn.addEventListener('click', () => openDialog());
  elements.addServiceBtn.addEventListener('click', openServiceDialog);
  elements.backupBtn.addEventListener('click', () => storageApi.createBackup());
  elements.closeDialogBtn.addEventListener('click', closeDialog);
  elements.closeServiceDialogBtn.addEventListener('click', closeServiceDialog);
  elements.cancelBtn.addEventListener('click', closeDialog);
  elements.cancelServiceBtn.addEventListener('click', closeServiceDialog);
  elements.modal.addEventListener('click', (event) => {
    if (event.target === elements.modal) closeDialog();
  });
  elements.serviceModal.addEventListener('click', (event) => {
    if (event.target === elements.serviceModal) closeServiceDialog();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !elements.modal.classList.contains('hidden')) closeDialog();
    if (event.key === 'Escape' && !elements.serviceModal.classList.contains('hidden')) closeServiceDialog();
  });
  elements.form.addEventListener('submit', saveDossier);
  elements.serviceForm.addEventListener('submit', saveService);
  elements.body.addEventListener('click', handleTableClick);
  elements.resetFiltersBtn.addEventListener('click', resetFilters);
  elements.pageSizeSelect.addEventListener('change', () => {
    currentPage = 1;
    renderTable();
  });
  elements.prevPageBtn.addEventListener('click', () => {
    currentPage -= 1;
    renderTable();
  });
  elements.nextPageBtn.addEventListener('click', () => {
    currentPage += 1;
    renderTable();
  });

  Object.values(elements.filters).forEach((input) => {
    input.addEventListener('input', () => {
      currentPage = 1;
      renderTable();
    });
    input.addEventListener('change', () => {
      currentPage = 1;
      renderTable();
    });
  });

  try {
    dossiers = await storageApi.listDossiers();
    const savedServices = await storageApi.listServices();
    const dossierServices = dossiers.map((dossier) => dossier.service).filter(Boolean);
    services = sortServices([...DEFAULT_SERVICES, ...savedServices, ...dossierServices]);
    if (savedServices.length === 0) {
      await storageApi.saveServices(services);
    }
  } catch (error) {
    window.alert('Impossible de charger les fichiers JSON.');
    dossiers = [];
    services = [...DEFAULT_SERVICES];
  }

  refreshServiceSelects();
  renderTable();
}

init();
