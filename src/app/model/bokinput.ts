export class BokInput extends Object {
  constructor(
    public _id: string,
    public name: string,
    public concept_id: string,
    public definition: string,
    public skills: string[],
    public linkedTo: string
  ) {
    super();
  }
}
