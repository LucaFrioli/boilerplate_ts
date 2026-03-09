import express, { type Application } from 'express';

class App {

	public app: Application;

	constructor() {
		this.app = express();
		this.middlewares();
		this.routes();
	}

	middlewares() {
		this.app.use(express.urlencoded({ extended: true }));
		this.app.use(express.json());
	}

	routes() {
	}
}

export default new App().app;
