import { Request, Response } from 'express';

const hello = (req: Request, res: Response) => {
    res.status(200).send('hello world');
};

export { hello };
