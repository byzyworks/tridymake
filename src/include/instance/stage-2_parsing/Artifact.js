import uuidv4 from 'uuid-random';
import md5    from 'md5';

export class Artifact {
    constructor(...value) {
        if (value.length === 0) {
            value = uuidv4();
        } else {
            if (value.length === 1) {
                value = value[0];
            }
            
            this.source = value;
            value       = JSON.stringify(value);
        }
        
        this.digest = md5(value);
    }

    toString() {
        return 'artifact ' + this.digest;
    }

    equalTo(other) {
        if (other instanceof Artifact) {
            return (this.digest === other.digest);
        }

        return false;
    } 
}