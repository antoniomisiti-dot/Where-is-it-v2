export class CollectionManager {
  constructor() {
    this.collections = [{ id: 'default', name: 'Default', createdAt: Date.now() }];
    this.activeId = 'default';
  }

  getActiveCollection() {
    return this.collections.find(c => c.id === this.activeId);
  }

  getCollections() {
    return this.collections;
  }

  setActive(id) {
    if (this.collections.some(c => c.id === id)) {
      this.activeId = id;
    }
  }
}