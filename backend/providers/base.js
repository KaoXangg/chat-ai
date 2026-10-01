export class AIProvider {
  constructor(name) {
    this.name = name;
  }

  async *streamChat(messages, model) {
    throw new Error(`Nhà cung cấp "${this.name}" chưa triển khai streamChat().`);
  }

  async generateTitle(text) {
    throw new Error(`Nhà cung cấp "${this.name}" chưa triển khai generateTitle().`);
  }

  isConfigured() {
    return true;
  }
}