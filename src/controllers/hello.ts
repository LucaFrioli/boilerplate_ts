const hello = (req:any,res:any)=>{
	console.log("Olá mundo");
	res.status(200).send("hello world")
}

export {hello}
