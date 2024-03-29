import { DeveloperService } from '@code/spicedb-common/src/services/developerservice';
import { ZedTerminalService } from '@code/spicedb-common/src/services/zedterminalservice';
import { LiveCheckService } from './check';
import { LocalParseService } from './localparse';

import { ProblemService } from './problem';
import { ValidationService } from './validation';

export interface Services {
  localParseService: LocalParseService;
  liveCheckService: LiveCheckService;
  validationService: ValidationService;
  problemService: ProblemService;
  developerService: DeveloperService;
  zedTerminalService: ZedTerminalService | undefined;
}
