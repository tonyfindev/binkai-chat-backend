import { Inject, Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  UserRepository,
} from "@/database/repositories";

// @ts-ignore
import { JsonRpcProvider } from "ethers";

@Injectable()
export class UserService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(UserRepository)
    private readonly userRepository: UserRepository,
  ) { }

  async onApplicationBootstrap() { }
 
}