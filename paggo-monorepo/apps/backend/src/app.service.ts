// import { Injectable } from '@nestjs/common';

// @Injectable()
// export class AppService {
//     getHello(): string {
//         return 'Hello local?!';
//     }
// }

import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
    getHello(): string {
        return 'Hello World!';
    }
}
