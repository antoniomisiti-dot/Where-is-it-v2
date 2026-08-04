export class StorageAdapter {
  constructor(provider) {
    this.provider = provider;
  }

  async getHistory() {
    return this.provider.getAll();
  }

  async saveHistory(history) {
    this.provider.saveAll(history);
  }
}