import express from 'express'; // ไว้สร้าง route
import bodyParser from 'body-parser'; // ใช้เพื่อทำการอ่านค่า body ที่ถูก rreturn เป็นเเบบ req ให้อยู่ในรูปของ json
import fs from 'fs'; // ใช้สหรับเขียน file หรือ read เอาไว้เก็บข้อมูลรูปแบบ json
import bcrypt from 'bcrypt'; // ใช้สำหรับเข้า รหัส password
import jwt from 'jsonwebtoken'; // ไว้สำหรับสร้าง token ของ user ไม่เเรียก user มาแบบตรงๆ เเต่เรียกไปแบบเป็น token 
import dotenv  from 'dotenv'; // ใช้เพื่อกำหนด .env ว่าตัว env ที่เราจะเลิอกใช้จะอยู่ที่ใด เช่น การเก็บรหัสของ database หรือเลิอก port ที่ต้องการต่อ


dotenv.config({ path: '.env' }); // เรียกไปยัง path ที่เรากำหนดไว้ โดยเริ่มเเรก หาก index.js ตัวนี้อยู่ที่หน้าไหน จะเป็น path เริ่มต้น จึงเรียก .env โดยตรง
const app = express();
// app.use(express.urlencoded({extended: true}));  
app.use(bodyParser.json());
const SECRET_KEY =  process.env.SECRET_KEY as string
const PORT = process.env.PORT 


interface User{
    id: number
    username: string
    password: string
}

interface DbSchema {
    users: User[]
}

type RegisterArgs = Omit<User, 'id'> // Omit  ไม่เอา interface อันไหน Omit<User, 'id', 'username'>

app.get('/',(req, res) =>{
    res.json({
        message: "Hello World"
    });
});

app.post<any, any, any, RegisterArgs>('/register', (req, res)=>{

    const body = req.body;
    const raw = fs.readFileSync('db.json', 'utf8');
    const db: DbSchema = JSON.parse(raw); //db: DbSchema กำลังบอกว่า db มาจาก interface ตัวไหน
    const hashPassword = bcrypt.hashSync(body.password, 10); // ต้องติดตั้ง yarn add bcrypt เนื่องจาก bcrypt ทำงานภายใต้ typescript เพราะฉะนั้นต้องทำการติดตั้ง  yarn add --dev @types/bcrypt ด้วย
    db.users.push({
        ...body,
        id: Date.now(),
        password: hashPassword
    });

    fs.writeFileSync('db.json', JSON.stringify(db))
    res.json({message: "register compete"})
});

type LoginAgrgs = Pick<User, 'username' | 'password'> // เลือกเฉพาะจะนำข้อมูลอะไรเข้ามา 

app.post<any, any, any, LoginAgrgs>('/login', (req, res) => {
    const body = req.body;
    const raw = fs.readFileSync('db.json', 'utf8' )
    const db: DbSchema = JSON.parse(raw)
    const users = db.users.find(user => user.username === body.username)
 
    if (!users){ // user มีหรือไม่
        res.status(400);
        res.json({message: 'user not find'});
        return 
    }

    // การเขียนแบบนี้ไม่ปลอดภัยต้องมีการ เข้ารหัสเสมอ 
    // if (users.password !== body.password ){
    //     res.status(400);
    //     res.json({message: 'Invalid username or password'})
    //     return
    // }

    // สามารถเขียน hash เเบบนี้ได้เเต่เสี่ยงที่จะทำให้ hacker รู้รหัสทางที่ดีต้องทำให้มัน return true กับ false 
    // if(users){
    //     const passwordUser = bcrypt.hashSync(users.password, 10)
    //     if(body.password  === passwordUser){
    //         res.status(400);
    //         res.json({message: 'user not find'});
    //         return 
    //     }
    // }

    // ปกติต้องเขียนแบบเข้ารหัส
    if (!bcrypt.compareSync(body.password, users.password)){ // เราเรียกใช้ bcrypt.compareSync ระหว่าง 2 ค่า คือ body.password ค่าที่ส่งเข้ามา เเละ users.password ค่าที่เก็บไว้ 
        res.status(400);                                          //หากตรงกันจะ return มาเป็น true หากไม่ตรง จะ return เป็น false ใส่ ! ด้านหน้าสุดแปลว่าหากไม่ตรงกันจะเข้าเงื่อนไข if 
        res.json({message: "Invalid username or password"});
        return
    }
    // res.json(users) return ตามปกติ จะ return ข้อมล  users ออกมา 
    const token = jwt.sign({id: users.id, username: users.username}, 'secretkey'); // เหมือนเราทำการยุบรวม id เเละ username ให้เป็น token เเละตั้งชื่อว่า secretkey
    res.json({token});
});

app.get('/secret', (req, res) => {
    // const token = req.query.token as string //as string เป็นการ cast ค่าให้ token ออกมาเป็น string เเละเป็นการเรียกใช้ ข้อมูลผ่านตัว query parameter ในบางครั้งอาจจะเป็นวิธที่ไม่ค่อยเหมาะสมกับการ ส่งข้อมูล
                                              // เนื่่องจากการใช้ส่งข้อมูลที่เป็นความลับไม่ควรจะใช้ params เนื่องจากตรง URL มันจะโชว์ข้อมูล การใช้ header จึงเป็นตัวเลือกที่ดีกว่า 
    const token = req.headers.authorization   // อันนี้ป็นอีกกรณีนึง คือใช้ headers รับค่าเเทน 
    if(!token){
        res.status(401);
        res.json({message: "undefined token"});
        return;
    }
    try{
        const tokenUser = jwt.verify(token, SECRET_KEY);
        console.log(tokenUser);
        res.json({message:'Valid key',data:[tokenUser]});
    }catch(err){
        res.status(401);
        res.json({message: err.message})
    }

})

app.listen(PORT, ()=> console.log(`Serve is running at port ${PORT}`));