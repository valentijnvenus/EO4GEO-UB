import { Pipe, PipeTransform } from '@angular/core';
@Pipe({
    name: 'filter'
})
export class FilterPipe implements PipeTransform {
    transform(arr: any[], searchValue: string) {
        if (!searchValue) { return arr; }
        return arr.filter(item => {
            return item.name.toLowerCase().indexOf(searchValue.toLowerCase()) > -1;
        });
    }
}
