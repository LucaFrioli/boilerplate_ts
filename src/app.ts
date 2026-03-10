import express, { type Application } from 'express';

class App {
	public app: Application;

	constructor() {
		this.app = express();
		this.middlewares();
		this.routes();
	}

	private middlewares(): void {
		this.app.use(express.urlencoded({ extended: true }));
		this.app.use(express.json());
	}

	private routes(): void {}
}

export default new App().app;
