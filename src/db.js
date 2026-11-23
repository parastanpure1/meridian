const DB_NAME = 'MeridianIceCreamDB';
const DB_VERSION = 1;
const STORE_NAME = 'orders';

function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id'
        });

        store.createIndex('createdAt', 'createdAt', {
          unique: false
        });

        store.createIndex('status', 'status', {
          unique: false
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function runRequest(mode, action) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);

    let request;

    try {
      request = action(store);
    } catch (error) {
      db.close();
      reject(error);
      return;
    }

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

    tx.oncomplete = () => db.close();

    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

// CREATE
export const addOrder = (order) =>
  runRequest('readwrite', store => store.add(order));

// READ ALL
export const getAllOrders = () =>
  runRequest('readonly', store => store.getAll());

// READ ONE
export const getOrder = (id) =>
  runRequest('readonly', store => store.get(id));

// UPDATE
export const updateOrder = (order) =>
  runRequest('readwrite', store => store.put(order));

// DELETE
export const deleteOrder = (id) =>
  runRequest('readwrite', store => store.delete(id));