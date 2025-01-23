import { DeveloperService } from "../spicedb-common/services/developerservice";
import { ZedTerminalService } from "../spicedb-common/services/zedterminalservice";
import { LiveCheckService } from "./check";
import { LocalParseService } from "./localparse";

import { ProblemService } from "./problem";
import { ValidationService } from "./validation";

export interface Services {
  localParseService: LocalParseService;
  liveCheckService: LiveCheckService;
  validationService: ValidationService;
  problemService: ProblemService;
  developerService: DeveloperService;
  zedTerminalService: ZedTerminalService | undefined;
}
