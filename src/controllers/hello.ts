const hello = (req: any, res: any) => {
	res.status(200).send('hello world');
};

export { hello };
