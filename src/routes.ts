import { Router } from 'express'

const router = Router()

router.get('/', (req, res) => {
	console.log('teste')
	res.send('Hello world !')
})

export default router
